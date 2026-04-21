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

/** Lista guardada en `numerosIncluidos` (JSON). */
export function numerosIncluidosArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

function numeroCoincideAlguno(numero: string, patrones: string[]): boolean {
  const norm = numero.trim().toLowerCase().replace(/\s+/g, "");
  const digits = norm.replace(/\D/g, "");
  return patrones.some((p) => {
    const pt = p.trim().toLowerCase().replace(/\s+/g, "");
    if (!pt) return false;
    if (norm === pt) return true;
    const pd = pt.replace(/\D/g, "");
    if (pd.length >= 8 && digits.length >= 8 && (digits.endsWith(pd) || pd.endsWith(digits))) return true;
    return norm.includes(pt) || pt.includes(norm);
  });
}

type EtapaMini = { esGanado: boolean; esPerdido: boolean } | null;

export function contactoPasaFiltrosRegla(
  regla: { numerosIncluidos: unknown; omitirGanadosPerdidos: boolean | null },
  contacto: { numero: string; etapa: EtapaMini }
): boolean {
  if (regla.omitirGanadosPerdidos !== false && contacto.etapa) {
    if (contacto.etapa.esGanado || contacto.etapa.esPerdido) return false;
  }
  const lista = numerosIncluidosArray(regla.numerosIncluidos);
  if (lista.length === 0) return true;
  return numeroCoincideAlguno(contacto.numero, lista);
}

export function filtrarContactosPorRegla<
  T extends { numero: string; etapa: EtapaMini },
>(regla: { numerosIncluidos: unknown; omitirGanadosPerdidos: boolean | null }, contactos: T[]): T[] {
  return contactos.filter((c) => contactoPasaFiltrosRegla(regla, c));
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
Máximo 2-3 líneas. Sin markdown. Sin emojis exagerados.
Si el contexto sugiere que el cliente ya cerró el tema, compró o no necesita nada más, mandá un mensaje muy breve y cordial sin insistir ni volver a preguntar lo mismo.`,
      },
      { role: "user", content: promptFinal },
    ],
    max_tokens: 150,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

type ReglaFiltros = {
  numerosIncluidos: unknown;
  omitirGanadosPerdidos: boolean | null;
};

export async function encontrarContactosElegibles(reglaId: string) {
  const regla = await prisma.reglaFollowUp.findUnique({
    where: { id: reglaId },
  });

  if (!regla || !regla.activa) return [];

  const filtros: ReglaFiltros = {
    numerosIncluidos: regla.numerosIncluidos,
    omitirGanadosPerdidos: regla.omitirGanadosPerdidos,
  };

  const ahora = new Date();
  const etapaInclude = { etapa: true } as const;

  if (regla.disparador === "TIEMPO_EN_ETAPA" && regla.diasEnEtapa != null && regla.etapaDisparoId) {
    const limite = new Date(ahora.getTime() - regla.diasEnEtapa * 24 * 60 * 60 * 1000);
    const candidatos = await prisma.contacto.findMany({
      where: {
        empresaId: regla.empresaId,
        etapaId: regla.etapaDisparoId,
        ultimaInteraccion: { lte: limite },
        seguimientos: { none: { reglaId: regla.id } },
      },
      include: etapaInclude,
    });
    return filtrarContactosPorRegla(filtros, candidatos);
  }

  if (regla.disparador === "SIN_RESPUESTA" && regla.horasSinRespuesta != null) {
    const limite = new Date(ahora.getTime() - regla.horasSinRespuesta * 60 * 60 * 1000);
    const candidatos = await prisma.contacto.findMany({
      where: {
        empresaId: regla.empresaId,
        ultimaInteraccion: { lte: limite },
        seguimientos: { none: { reglaId: regla.id } },
      },
      include: etapaInclude,
    });
    return filtrarContactosPorRegla(filtros, candidatos);
  }

  if (regla.disparador === "FECHA_PROGRAMADA") {
    const candidatos = await prisma.contacto.findMany({
      where: {
        empresaId: regla.empresaId,
        proximoSeguimiento: { lte: ahora },
        seguimientos: { none: { reglaId: regla.id } },
      },
      include: etapaInclude,
    });
    return filtrarContactosPorRegla(filtros, candidatos);
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
        etapa: true,
        historialEtapas: {
          orderBy: { cambiadoEn: "desc" },
          take: 1,
        },
      },
    });
    const filtrados = candidatos.filter((c) => {
      const last = c.historialEtapas[0];
      if (!last) return false;
      return (
        last.etapaNueva === regla.etapaDisparoId && last.cambiadoEn.getTime() >= haceUnaHora.getTime()
      );
    });
    return filtrarContactosPorRegla(filtros, filtrados);
  }

  return [];
}

/** Parsea textarea de números (una por línea o separados por coma). */
export function parsearListaNumerosSeguimiento(texto: string): string[] {
  const partes = texto
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(partes));
}
