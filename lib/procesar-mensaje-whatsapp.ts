import type { AtencionHumanaEstado, CanalConversacion, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calcularCreditos } from "@/lib/creditos";
import { construirSystemPrompt, generarRespuestaAgente } from "@/lib/openai";
import { enviarMensajeWhatsApp } from "@/lib/whatsapp";
import { obtenerTextoCatalogoExterno } from "@/lib/stock-api";
import { obtenerOCrearContacto } from "@/lib/crm";

type Msg = { role: "user" | "assistant"; content: string };

function colaHumanaBloqueaIa(conv: {
  estado: string;
  atencionHumana: AtencionHumanaEstado;
}): boolean {
  if (conv.atencionHumana === "ACTIVA") return true;
  if (conv.estado === "DERIVADA_HUMANO" && conv.atencionHumana === "NINGUNA") return true;
  return false;
}

export async function procesarMensajeWhatsApp(input: {
  numeroCliente: string;
  textoMensaje: string;
  phoneNumberId: string;
  esGrupo: boolean;
  nombreCliente?: string | null;
}): Promise<void> {
  const empresa = await prisma.empresa.findFirst({
    where: { whatsappPhoneId: input.phoneNumberId, activo: true },
  });
  if (!empresa?.whatsappToken) return;

  const contacto = await obtenerOCrearContacto(
    empresa.id,
    input.numeroCliente,
    input.nombreCliente,
    "WHATSAPP"
  );

  const agenteDefault = await prisma.agente.findFirst({
    where: { empresaId: empresa.id, activo: true, esDefault: true },
  });
  const agente =
    agenteDefault ??
    (await prisma.agente.findFirst({
      where: { empresaId: empresa.id, activo: true },
    }));
  if (!agente) return;

  const canalWa: CanalConversacion = "WHATSAPP";
  const convPrev = await prisma.conversacion.findFirst({
    where: { empresaId: empresa.id, numeroCliente: input.numeroCliente, canal: canalWa },
    orderBy: { ultimoMensaje: "desc" },
  });

  const mensajesPrev = (convPrev?.mensajes as Msg[] | null) ?? [];
  const userTurn: Msg[] = [...mensajesPrev, { role: "user", content: input.textoMensaje }];
  const now = new Date();

  let convId: string;
  if (!convPrev) {
    const c = await prisma.conversacion.create({
      data: {
        empresaId: empresa.id,
        agenteId: agente.id,
        numeroCliente: input.numeroCliente,
        nombreCliente: input.nombreCliente?.trim() || null,
        esGrupo: input.esGrupo,
        canal: canalWa,
        contactoId: contacto.id,
        mensajes: userTurn as unknown as Prisma.InputJsonValue,
        ultimoMensaje: now,
      },
    });
    convId = c.id;
  } else {
    const reopenEstado =
      convPrev.atencionHumana === "RESUELTA"
        ? ({ atencionHumana: "NINGUNA" as const, estado: "ACTIVA" as const } as const)
        : convPrev.estado === "RESUELTA"
          ? ({ estado: "ACTIVA" as const } as const)
          : ({} as const);
    await prisma.conversacion.update({
      where: { id: convPrev.id },
      data: {
        ...reopenEstado,
        mensajes: userTurn as unknown as Prisma.InputJsonValue,
        ultimoMensaje: now,
        esGrupo: input.esGrupo || convPrev.esGrupo,
        contactoId: contacto.id,
        ...(input.nombreCliente?.trim() ? { nombreCliente: input.nombreCliente.trim() } : {}),
      },
    });
    convId = convPrev.id;
  }

  const conv = await prisma.conversacion.findUniqueOrThrow({ where: { id: convId } });

  const bloquear =
    conv.iaHabilitada === false ||
    colaHumanaBloqueaIa({ estado: conv.estado, atencionHumana: conv.atencionHumana });

  if (bloquear) {
    return;
  }

  const archivos = await prisma.archivoConocimiento.findMany({
    where: {
      empresaId: empresa.id,
      OR: [{ agenteId: agente.id }, { agenteId: null }],
    },
  });
  const desdeArchivos = archivos.map((a) => (a.contenido ? a.contenido : `[${a.nombre}]`)).join("\n\n");
  const desdeErp =
    agente.busquedaProductos !== false ? await obtenerTextoCatalogoExterno(empresa) : "";
  const conocimiento = [desdeArchivos, desdeErp].filter(Boolean).join("\n\n");

  const systemPrompt = construirSystemPrompt(agente, conocimiento, empresa.nombre);

  const historial: Msg[] = mensajesPrev.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let texto: string;
  let tokensTotal: number;
  try {
    const r = await generarRespuestaAgente({
      systemPrompt,
      historial,
      mensajeUsuario: input.textoMensaje,
      model: agente.modeloOpenai,
      temperature: agente.temperatura,
      maxTokens: agente.maxTokens,
    });
    texto = r.texto;
    tokensTotal = r.tokensTotal;
  } catch (e) {
    console.error("OpenAI error", e);
    texto =
      "Disculpá, ahora no puedo responder. Probá de nuevo en unos minutos o pedí hablar con un asesor.";
    tokensTotal = 0;
  }

  const nuevos: Msg[] = [...mensajesPrev, { role: "user", content: input.textoMensaje }, { role: "assistant", content: texto }];

  const creditosDelta = calcularCreditos(tokensTotal);

  await prisma.conversacion.update({
    where: { id: convId },
    data: {
      mensajes: nuevos as unknown as Prisma.InputJsonValue,
      tokensUsados: { increment: tokensTotal },
      creditosUsados: { increment: creditosDelta },
      ultimoMensaje: new Date(),
      agenteId: agente.id,
    },
  });

  if (creditosDelta > 0) {
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { creditosUsados: { increment: creditosDelta } },
    });
  }

  await enviarMensajeWhatsApp({
    phoneNumberId: input.phoneNumberId,
    accessToken: empresa.whatsappToken,
    to: input.numeroCliente,
    text: texto,
  });
}
