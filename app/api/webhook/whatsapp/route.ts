import { verificarFirmaMeta } from "@/lib/whatsapp";
import { procesarMensajeWhatsApp } from "@/lib/procesar-mensaje-whatsapp";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/**
 * Meta exige respuesta rápida. Leemos el cuerpo en crudo (firma), validamos,
 * encolamos el trabajo con `void` y respondemos 200 de inmediato para liberar
 * la función serverless y reducir presión sobre el pool de conexiones.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (process.env.NODE_ENV === "production" && !verificarFirmaMeta(raw, sig)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("OK", { status: 200 });
  }

  const b = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<Record<string, unknown> & { type?: string; from?: string }>;
          metadata?: { phone_number_id?: string };
          contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        };
      }>;
    }>;
  };

  const value = b.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  const phoneNumberId = value?.metadata?.phone_number_id;
  const nombreCliente = value?.contacts?.[0]?.profile?.name ?? null;

  if (!message?.from || !phoneNumberId || !message.type) {
    return new Response("OK", { status: 200 });
  }

  const t = message.type;
  if (t === "text" && !(message as { text?: { body?: string } }).text?.body?.trim()) {
    return new Response("OK", { status: 200 });
  }
  if (t === "audio" && !(message as { audio?: { id?: string } }).audio?.id) {
    return new Response("OK", { status: 200 });
  }
  if (t === "image" && !(message as { image?: { id?: string } }).image?.id) {
    return new Response("OK", { status: 200 });
  }

  const rawFrom = message.from;
  const numeroCliente = rawFrom;
  const esGrupo = typeof rawFrom === "string" && (rawFrom.includes("@g.us") || rawFrom.includes("g.us"));

  void procesarMensajeWhatsApp({
    numeroCliente,
    phoneNumberId,
    esGrupo,
    nombreCliente,
    mensaje: message,
  }).catch((e) => console.error("[webhook/whatsapp] procesarMensajeWhatsApp", e));

  return new Response("OK", { status: 200 });
}
