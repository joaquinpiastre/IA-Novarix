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

/**
 * WhatsApp envía un media_id; hay que pedir la URL a Graph y descargar el binario.
 */
export async function descargarMediaWhatsApp(
  mediaId: string,
  whatsappToken: string
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  const metaResponse = await fetch(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${whatsappToken}` },
  });

  if (!metaResponse.ok) {
    throw new Error(`Error obteniendo media URL: ${metaResponse.status}`);
  }

  const mediaData = (await metaResponse.json()) as { url?: string; mime_type?: string };
  const mediaUrl = mediaData.url;
  const mimeType = mediaData.mime_type || "application/octet-stream";
  if (!mediaUrl) {
    throw new Error("Respuesta Meta sin url de media");
  }

  const extensiones: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const extension = extensiones[mimeType] || "bin";

  const archivoResponse = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${whatsappToken}` },
  });

  if (!archivoResponse.ok) {
    throw new Error(`Error descargando archivo: ${archivoResponse.status}`);
  }

  const arrayBuffer = await archivoResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, mimeType, extension };
}
