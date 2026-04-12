import { verificarFirmaMeta } from "@/lib/whatsapp";
import { procesarMensajeWhatsApp } from "@/lib/procesar-mensaje-whatsapp";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verify = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && verify && token === verify && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (process.env.NODE_ENV === "production" && !verificarFirmaMeta(raw, sig)) {
    return Response.json({ error: "Firma inválida" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ status: "ignored" });
  }

  const b = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{ type?: string; from?: string; text?: { body?: string } }>;
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

  if (!message || message.type !== "text" || !message.from || !message.text?.body || !phoneNumberId) {
    return Response.json({ status: "ignored" });
  }

  const rawFrom = message.from;
  const numeroCliente = rawFrom;
  const esGrupo = typeof rawFrom === "string" && (rawFrom.includes("@g.us") || rawFrom.includes("g.us"));
  const textoMensaje = message.text.body;

  void procesarMensajeWhatsApp({
    numeroCliente,
    textoMensaje,
    phoneNumberId,
    esGrupo,
    nombreCliente,
  }).catch((e) =>
    console.error("WhatsApp process error", e)
  );

  return Response.json({ status: "ok" });
}
