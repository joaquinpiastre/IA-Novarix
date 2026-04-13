import { prisma } from "@/lib/db";
import { getOpenAI } from "@/lib/openai";

export function reemplazarVariables(
  texto: string,
  contacto: { nombre?: string | null; numero: string },
  empresa: { nombre: string },
  etapaNombre?: string | null
): string {
  return texto
    .replace(/\{nombre\}/g, contacto.nombre || "cliente")
    .replace(/\{numero\}/g, contacto.numero)
    .replace(/\{empresa\}/g, empresa.nombre)
    .replace(/\{etapa_actual\}/g, etapaNombre || "—");
}

export async function generarMensajeFollowUp(
  prompt: string,
  contacto: { nombre?: string | null; numero: string },
  empresa: { nombre: string },
  etapaNombre?: string | null
): Promise<string> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const promptFinal = reemplazarVariables(prompt, contacto, empresa, etapaNombre);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Sos un asistente de ventas de ${empresa.nombre}. 
Generá mensajes de seguimiento cortos, naturales y en español argentino.
Máximo 2-3 líneas. Sin markdown. Sin emojis exagerados.`,
      },
      { role: "user", content: promptFinal },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

export async function encontrarContactosElegibles(reglaId: string) {
  const regla = await prisma.reglaFollowUp.findUnique({
    where: { id: reglaId },
  });

  if (!regla || !regla.activa) return [];

  const ahora = new Date();

  if (regla.disparador === "TIEMPO_EN_ETAPA" && regla.diasEnEtapa != null && regla.etapaDisparoId) {
    const limite = new Date(ahora.getTime() - regla.diasEnEtapa * 24 * 60 * 60 * 1000);
    return prisma.contacto.findMany({
      where: {
        empresaId: regla.empresaId,
        etapaId: regla.etapaDisparoId,
        ultimaInteraccion: { lte: limite },
        seguimientos: { none: { reglaId: regla.id } },
      },
    });
  }

  if (regla.disparador === "SIN_RESPUESTA" && regla.horasSinRespuesta != null) {
    const limite = new Date(ahora.getTime() - regla.horasSinRespuesta * 60 * 60 * 1000);
    return prisma.contacto.findMany({
      where: {
        empresaId: regla.empresaId,
        ultimaInteraccion: { lte: limite },
        seguimientos: { none: { reglaId: regla.id } },
      },
    });
  }

  if (regla.disparador === "FECHA_PROGRAMADA") {
    return prisma.contacto.findMany({
      where: {
        empresaId: regla.empresaId,
        proximoSeguimiento: { lte: ahora },
        seguimientos: { none: { reglaId: regla.id } },
      },
    });
  }

  if (regla.disparador === "ETAPA_ESPECIFICA" && regla.etapaDisparoId) {
    const haceUnaHora = new Date(ahora.getTime() - 60 * 60 * 1000);
    const candidatos = await prisma.contacto.findMany({
      where: {
        empresaId: regla.empresaId,
        etapaId: regla.etapaDisparoId,
        seguimientos: { none: { reglaId: regla.id } },
      },
      include: {
        historialEtapas: {
          orderBy: { cambiadoEn: "desc" },
          take: 1,
        },
      },
    });
    return candidatos.filter((c) => {
      const last = c.historialEtapas[0];
      if (!last) return false;
      return (
        last.etapaNueva === regla.etapaDisparoId && last.cambiadoEn.getTime() >= haceUnaHora.getTime()
      );
    });
  }

  return [];
}
