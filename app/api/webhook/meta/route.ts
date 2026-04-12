import { verificarFirmaMeta } from "@/lib/whatsapp";
import { prisma } from "@/lib/db";
import { procesarMensajeMeta } from "@/lib/procesar-mensaje-meta";

function verifyToken(): string | null {
  return (
    process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() ||
    process.env.WHATSAPP_VERIFY_TOKEN?.trim() ||
    null
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verify = verifyToken();
  if (mode === "subscribe" && token && verify && token === verify && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { text?: string; is_echo?: boolean };
  postback?: unknown;
};

function textoDeMessaging(ev: MessagingEvent): string | null {
  if (ev.message?.is_echo) return null;
  const t = ev.message?.text?.trim();
  return t || null;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.META_APP_SECRET?.trim() || process.env.WHATSAPP_APP_SECRET?.trim();
    if (secret && !verificarFirmaMeta(raw, sig)) {
      return Response.json({ error: "Firma inválida" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ status: "ignored" });
  }

  const b = body as {
    object?: string;
    entry?: Array<{
      id?: string;
      messaging?: MessagingEvent[];
    }>;
  };

  const object = b.object;
  if (!object || !b.entry?.length) {
    return Response.json({ status: "ignored" });
  }

  for (const entry of b.entry) {
    const entryId = entry.id;
    const messaging = entry.messaging ?? [];

    if (object === "page") {
      const empresa = await prisma.empresa.findFirst({
        where: { metaPageId: entryId ?? "", activo: true },
      });
      if (!empresa?.metaPageToken) continue;

      for (const ev of messaging) {
        const text = textoDeMessaging(ev);
        const sender = ev.sender?.id;
        if (!text || !sender) continue;
        void procesarMensajeMeta({
          empresaId: empresa.id,
          canal: "MESSENGER",
          senderId: sender,
          textoMensaje: text,
          nombreCliente: null,
        }).catch((e) => console.error("Meta Messenger process error", e));
      }
    }

    if (object === "instagram") {
      const eid = entryId ?? "";
      let empresa = eid
        ? await prisma.empresa.findFirst({
            where: { metaInstagramId: eid, activo: true },
          })
        : null;
      if (!empresa && eid) {
        empresa = await prisma.empresa.findFirst({
          where: { metaPageId: eid, activo: true },
        });
      }
      if (!empresa?.metaPageToken || !empresa.metaInstagramId) continue;

      for (const ev of messaging) {
        const text = textoDeMessaging(ev);
        const sender = ev.sender?.id;
        if (!text || !sender) continue;
        void procesarMensajeMeta({
          empresaId: empresa.id,
          canal: "INSTAGRAM",
          senderId: sender,
          textoMensaje: text,
          nombreCliente: null,
        }).catch((e) => console.error("Meta Instagram process error", e));
      }
    }
  }

  return Response.json({ status: "ok" });
}
