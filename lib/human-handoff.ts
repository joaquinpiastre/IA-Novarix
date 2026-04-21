const HUMAN_ESCALATION_REPLY = "Entendido, en breve te contacta un asesor.";

const HUMAN_PATTERNS: RegExp[] = [
  /\b(asesor|agente|persona|humano|operador)\b/,
  /\b(hablar|comunicarme|contactarme|derivar|transferir)\b.{0,24}\b(con|con un|a)\b.{0,16}\b(humano|persona|asesor|agente)\b/,
  /\b(quiero|necesito|prefiero)\b.{0,20}\b(humano|persona|asesor|agente)\b/,
  /\b(atencion|atención)\b.{0,16}\b(humana|personalizada)\b/,
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function requiresHumanHandoff(rawText: string): boolean {
  const text = normalize(rawText);
  if (!text || text.length < 3) return false;
  return HUMAN_PATTERNS.some((pattern) => pattern.test(text));
}

export function getHumanHandoffReply(nombreResponsable?: string | null): string {
  const nombre = (nombreResponsable ?? "").trim();
  if (!nombre) return HUMAN_ESCALATION_REPLY;
  return `Entendido, en breve te contacta ${nombre}.`;
}
