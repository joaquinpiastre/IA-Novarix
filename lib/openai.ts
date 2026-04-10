import OpenAI from "openai";
import type { Agente } from "@prisma/client";

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return new OpenAI({
    apiKey: key || "sk-build-placeholder",
  });
}

let _client: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_client) _client = getOpenAIClient();
  return _client;
}

export function construirSystemPrompt(
  agente: Agente,
  conocimiento: string,
  nombreEmpresa?: string | null
): string {
  const marca = nombreEmpresa?.trim() || "la empresa";
  const extraTenant = agente.promptTenant?.trim()
    ? `\n\nINSTRUCCIONES ESPECÍFICAS DEL TENANT:\n${agente.promptTenant.trim()}`
    : "";
  const transfer =
    agente.permiteTransferencia === true
      ? "\n- Si el cliente pide otro tema o especialista, indicá que podés derivar la conversación cuando corresponda."
      : "";

  return `
Sos ${agente.nombre}, un asistente virtual de IA desarrollado por Novarix Digital Agency.

INSTRUCCIONES PRINCIPALES:
${agente.prompt}
${extraTenant}

BASE DE CONOCIMIENTO DISPONIBLE:
${conocimiento}

REGLAS OBLIGATORIAS:
- Respondé SIEMPRE en español argentino (usá "vos" en vez de "tú")
- Sé conciso pero completo — máximo 3 párrafos por respuesta
- Si no sabés algo o no tenés la información, decilo honestamente
- NO inventes precios, stock ni información que no esté en tu base de conocimiento
- Si el cliente pide hablar con un humano, respondé: "Entendido, en breve te contacta un asesor"
- Nunca menciones que sos una IA de OpenAI — sos el asistente de ${marca}
- Formato: texto plano sin markdown (WhatsApp no renderiza *asteriscos* bien en todos los casos)
- Si necesitás enumerar cosas, usá guiones simples (-)${transfer}

TONO:
- Profesional pero cercano
- Directo al punto
- Amable sin ser exagerado
`.trim();
}

export async function generarRespuestaAgente(params: {
  systemPrompt: string;
  historial: { role: "user" | "assistant"; content: string }[];
  mensajeUsuario: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ texto: string; tokensTotal: number }> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const model = params.model?.trim() || "gpt-4o-mini";
  const temperature = params.temperature ?? 0.6;
  const maxTokens = params.maxTokens ?? 1024;

  const completion = await getOpenAI().chat.completions.create({
    model,
    messages: [
      { role: "system", content: params.systemPrompt },
      ...params.historial.slice(-10),
      { role: "user", content: params.mensajeUsuario },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  const texto = completion.choices[0]?.message?.content?.trim() ?? "";
  const tokensTotal = completion.usage?.total_tokens ?? 0;
  return { texto, tokensTotal };
}
