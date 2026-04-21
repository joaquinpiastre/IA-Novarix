import type { AtencionHumanaEstado, CanalConversacion, OrigenContacto, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calcularCreditos } from "@/lib/creditos";
import { construirSystemPrompt, generarRespuestaAgente } from "@/lib/openai";
import { obtenerTextoCatalogoExterno } from "@/lib/stock-api";
import { obtenerOCrearContacto } from "@/lib/crm";
import { enviarMensajeInstagram, enviarMensajeMessenger } from "@/lib/meta-graph";
import { getHumanHandoffReply, requiresHumanHandoff } from "@/lib/human-handoff";

type Msg = { role: "user" | "assistant"; content: string };

function colaHumanaBloqueaIa(conv: {
  estado: string;
  atencionHumana: AtencionHumanaEstado;
}): boolean {
  if (conv.atencionHumana === "ACTIVA") return true;
  if (conv.estado === "DERIVADA_HUMANO" && conv.atencionHumana === "NINGUNA") return true;
  return false;
}

function claveContactoCrm(canal: CanalConversacion, senderId: string): string {
  if (canal === "MESSENGER") return `m:${senderId}`;
  if (canal === "INSTAGRAM") return `ig:${senderId}`;
  return senderId;
}

export async function procesarMensajeMeta(input: {
  empresaId: string;
  canal: CanalConversacion;
  senderId: string;
  textoMensaje: string;
  nombreCliente?: string | null;
}): Promise<void> {
  const empresa = await prisma.empresa.findFirst({
    where: { id: input.empresaId, activo: true },
  });
  if (!empresa?.metaPageToken || !empresa.metaPageId) return;

  const origen: OrigenContacto = input.canal === "INSTAGRAM" ? "INSTAGRAM" : "FACEBOOK";
  const contacto = await obtenerOCrearContacto(
    empresa.id,
    claveContactoCrm(input.canal, input.senderId),
    input.nombreCliente,
    origen
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

  const convPrev = await prisma.conversacion.findFirst({
    where: {
      empresaId: empresa.id,
      numeroCliente: input.senderId,
      canal: input.canal,
    },
    orderBy: { ultimoMensaje: "desc" },
  });

  const mensajesPrev = (convPrev?.mensajes as Msg[] | null) ?? [];
  const solicitaHumano = requiresHumanHandoff(input.textoMensaje);
  const respuestaHumana = getHumanHandoffReply(agente.responsableHumano);
  const yaEnColaHumana = convPrev?.atencionHumana === "ACTIVA";
  const userTurn: Msg[] =
    solicitaHumano && !yaEnColaHumana
      ? [
          ...mensajesPrev,
          { role: "user", content: input.textoMensaje },
          { role: "assistant", content: respuestaHumana },
        ]
      : [...mensajesPrev, { role: "user", content: input.textoMensaje }];
  const now = new Date();

  let convId: string;
  if (!convPrev) {
    const c = await prisma.conversacion.create({
      data: {
        empresaId: empresa.id,
        agenteId: agente.id,
        numeroCliente: input.senderId,
        nombreCliente: input.nombreCliente?.trim() || null,
        esGrupo: false,
        canal: input.canal,
        contactoId: contacto.id,
        atencionHumana: solicitaHumano ? "ACTIVA" : "NINGUNA",
        estado: solicitaHumano ? "DERIVADA_HUMANO" : "ACTIVA",
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
        ...(solicitaHumano ? { atencionHumana: "ACTIVA" as const, estado: "DERIVADA_HUMANO" as const } : {}),
        mensajes: userTurn as unknown as Prisma.InputJsonValue,
        ultimoMensaje: now,
        contactoId: contacto.id,
        ...(input.nombreCliente?.trim() ? { nombreCliente: input.nombreCliente.trim() } : {}),
      },
    });
    convId = convPrev.id;
  }

  if (solicitaHumano) {
    if (!yaEnColaHumana) {
      if (input.canal === "MESSENGER") {
        await enviarMensajeMessenger(empresa.metaPageToken, input.senderId, respuestaHumana);
      } else if (input.canal === "INSTAGRAM" && empresa.metaInstagramId) {
        await enviarMensajeInstagram(empresa.metaPageToken, empresa.metaInstagramId, input.senderId, respuestaHumana);
      }
    }
    return;
  }

  const conv = await prisma.conversacion.findUniqueOrThrow({ where: { id: convId } });

  if (empresa.chatIaPausado) {
    return;
  }

  const bloquear =
    conv.iaHabilitada === false ||
    colaHumanaBloqueaIa({ estado: conv.estado, atencionHumana: conv.atencionHumana });

  if (bloquear) return;

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
    console.error("OpenAI error (Meta)", e);
    texto =
      "Disculpá, ahora no puedo responder. Probá de nuevo en unos minutos o escribinos por otro canal.";
    tokensTotal = 0;
  }

  const nuevos: Msg[] = [
    ...mensajesPrev,
    { role: "user", content: input.textoMensaje },
    { role: "assistant", content: texto },
  ];

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

  const token = empresa.metaPageToken;
  if (input.canal === "MESSENGER") {
    await enviarMensajeMessenger(token, input.senderId, texto);
  } else if (input.canal === "INSTAGRAM" && empresa.metaInstagramId) {
    await enviarMensajeInstagram(token, empresa.metaInstagramId, input.senderId, texto);
  }
}
