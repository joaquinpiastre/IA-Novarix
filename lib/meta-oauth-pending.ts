import { createHmac, timingSafeEqual } from "crypto";
const COOKIE = "novarix_meta_oauth_pages";
const MAX_AGE_SEC = 600;

function secret() {
  return process.env.NEXTAUTH_SECRET || process.env.META_OAUTH_SECRET || "novarix-meta-oauth";
}

export type PaginaOAuthPendiente = {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string; username?: string };
};

type Payload = { empresaId: string; exp: number; pages: PaginaOAuthPendiente[] };

function firmar(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function serializarCookiePaginasPendientes(empresaId: string, pages: PaginaOAuthPendiente[]): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const body: Payload = { empresaId, exp, pages };
  const json = JSON.stringify(body);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const sig = firmar(b64);
  return `${b64}.${sig}`;
}

export function parsearCookiePaginasPendientes(raw: string | undefined): Payload | null {
  if (!raw?.includes(".")) return null;
  const i = raw.lastIndexOf(".");
  const b64 = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = firmar(b64);
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const j = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as Payload;
    if (!j.empresaId || typeof j.exp !== "number" || !Array.isArray(j.pages)) return null;
    if (Date.now() > j.exp) return null;
    return j;
  } catch {
    return null;
  }
}

export const META_OAUTH_PAGES_COOKIE = COOKIE;
export const META_OAUTH_PAGES_COOKIE_MAX_AGE = MAX_AGE_SEC;
