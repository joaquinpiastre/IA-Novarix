import { createHmac, timingSafeEqual } from "crypto";

const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v18.0";

export async function enviarMensajeWhatsApp(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}): Promise<Response> {
  const url = `https://graph.facebook.com/${API_VERSION}/${params.phoneNumberId}/messages`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      // Grupos: id tipo 120363…@g.us → Meta suele aceptar solo dígitos del id de grupo
      to: params.to.includes("@g.us")
        ? params.to.replace(/^(\d+).*/, "$1")
        : params.to.replace(/\D/g, ""),
      type: "text",
      text: { body: params.text },
    }),
  });
}

export function verificarFirmaMeta(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signature?.startsWith("sha256=")) return false;
  try {
    const expected =
      "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
