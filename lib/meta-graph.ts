const API_VERSION = process.env.WHATSAPP_API_VERSION ?? process.env.META_GRAPH_API_VERSION ?? "v18.0";

export function getMetaAppId(): string | null {
  return process.env.META_APP_ID?.trim() || null;
}

export function getMetaAppSecret(): string | null {
  return process.env.META_APP_SECRET?.trim() || process.env.WHATSAPP_APP_SECRET?.trim() || null;
}

export function getMetaOAuthRedirectUri(): string {
  const base = process.env.META_OAUTH_REDIRECT_URI?.trim();
  if (base) return base;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/api/meta/oauth/callback`;
}

export async function intercambiarCodePorToken(code: string): Promise<{ access_token: string } | null> {
  const appId = getMetaAppId();
  const secret = getMetaAppSecret();
  const redirect = getMetaOAuthRedirectUri();
  if (!appId || !secret) return null;
  const url = new URL(`https://graph.facebook.com/${API_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", secret);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("code", code);
  const r = await fetch(url.toString());
  const j = (await r.json()) as { access_token?: string; error?: unknown };
  if (!r.ok || !j.access_token) return null;
  return { access_token: j.access_token };
}

export async function intercambiarPorTokenLargoPlazo(shortUserToken: string): Promise<string | null> {
  const appId = getMetaAppId();
  const secret = getMetaAppSecret();
  if (!appId || !secret) return null;
  const url = new URL(`https://graph.facebook.com/${API_VERSION}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", secret);
  url.searchParams.set("fb_exchange_token", shortUserToken);
  const r = await fetch(url.toString());
  const j = (await r.json()) as { access_token?: string };
  return j.access_token ?? null;
}

export type CuentaPaginaMeta = {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string; username?: string };
};

export async function listarPaginasDelUsuario(userAccessToken: string): Promise<CuentaPaginaMeta[]> {
  const url = new URL(`https://graph.facebook.com/${API_VERSION}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,access_token,picture{url},instagram_business_account{id,username}"
  );
  url.searchParams.set("access_token", userAccessToken);
  const r = await fetch(url.toString());
  const j = (await r.json()) as { data?: CuentaPaginaMeta[] };
  return j.data ?? [];
}

/** Registra la app actual para recibir webhooks de Messenger (y campos relacionados) en la página. */
export async function suscribirWebhookPagina(pageId: string, pageAccessToken: string): Promise<void> {
  const fields = ["messages", "messaging_postbacks"].join(",");
  const u = new URL(`https://graph.facebook.com/${API_VERSION}/${pageId}/subscribed_apps`);
  u.searchParams.set("subscribed_fields", fields);
  u.searchParams.set("access_token", pageAccessToken);
  const r = await fetch(u.toString(), { method: "POST" });
  if (!r.ok) {
    const t = await r.text();
    console.warn("Meta subscribed_apps (página):", r.status, t);
  }
}

/** Webhooks de Instagram Direct con la cuenta profesional vinculada a la página. */
export async function suscribirWebhookInstagram(
  instagramBusinessAccountId: string,
  pageAccessToken: string
): Promise<void> {
  const u = new URL(`https://graph.facebook.com/${API_VERSION}/${instagramBusinessAccountId}/subscribed_apps`);
  u.searchParams.set("subscribed_fields", "messages");
  u.searchParams.set("access_token", pageAccessToken);
  const r = await fetch(u.toString(), { method: "POST" });
  if (!r.ok) {
    const t = await r.text();
    console.warn("Meta subscribed_apps (Instagram):", r.status, t);
  }
}

export async function registrarWebhooksMetaPagina(
  pageId: string,
  pageAccessToken: string,
  instagramBusinessAccountId?: string | null
): Promise<void> {
  await suscribirWebhookPagina(pageId, pageAccessToken);
  if (instagramBusinessAccountId) {
    await suscribirWebhookInstagram(instagramBusinessAccountId, pageAccessToken);
  }
}

export async function enviarMensajeMessenger(pageAccessToken: string, recipientPsid: string, text: string) {
  const url = `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });
}

/** Instagram Direct: requiere id de cuenta profesional de Instagram y token de página. */
export async function enviarMensajeInstagram(
  pageAccessToken: string,
  instagramBusinessAccountId: string,
  recipientIgsid: string,
  text: string
) {
  const url = `https://graph.facebook.com/${API_VERSION}/${instagramBusinessAccountId}/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
    }),
  });
}
