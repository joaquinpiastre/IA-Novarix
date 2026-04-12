import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  return process.env.NEXTAUTH_SECRET || process.env.META_OAUTH_SECRET || "novarix-meta-oauth";
}

export function crearMetaOAuthState(empresaId: string): string {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ empresaId, exp }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function parseMetaOAuthState(state: string | null): { empresaId: string } | null {
  if (!state?.includes(".")) return null;
  const i = state.lastIndexOf(".");
  const payload = state.slice(0, i);
  const sig = state.slice(i + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const j = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { empresaId?: string; exp?: number };
    if (!j.empresaId || typeof j.exp !== "number") return null;
    if (Date.now() > j.exp) return null;
    return { empresaId: j.empresaId };
  } catch {
    return null;
  }
}
