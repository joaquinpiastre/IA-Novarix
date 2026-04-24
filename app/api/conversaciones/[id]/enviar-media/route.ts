import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import {
  enviarAdjuntoInstagram,
  enviarAdjuntoMessenger,
  enviarMensajeInstagram,
  enviarMensajeMessenger,
  textoErrorGraphApi,
  type MetaAdjuntoTipo,
} from "@/lib/meta-graph";
import { enviarMensajeWhatsApp, enviarMensajeWhatsAppMedia, subirMediaWhatsApp } from "@/lib/whatsapp";

const MAX = 50 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

function waMediaKind(mime: string): "image" | "video" | "audio" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) {
    // WhatsApp Cloud API no acepta audio/webm como nota de voz; se envía como documento.
    if (mime === "audio/webm") return "document";
    return "audio";
  }
  return "document";
}

function metaAdjuntoTipo(mime: string): MetaAdjuntoTipo {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function tipoHilo(mime: string): "image" | "video" | "audio" | "document" {
  const k = waMediaKind(mime);
  return k;
}

function etiquetaContenido(tipo: "image" | "video" | "audio" | "document", nombre: string, caption: string) {
  if (caption) return caption;
  if (tipo === "image") return "📷 Imagen";
  if (tipo === "video") return "🎬 Video";
  if (tipo === "audio") return "🎤 Audio";
  return `📎 ${nombre}`;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Falta BLOB_READ_WRITE_TOKEN (Vercel Blob): hace falta para guardar el adjunto y que Meta/WhatsApp lo puedan usar.",
      },
      { status: 503 }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const captionRaw = typeof form?.get("caption") === "string" ? (form.get("caption") as string) : "";
  const caption = captionRaw.trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido (campo file)" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "El archivo supera los 50MB" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: `Tipo no permitido: ${mime}` }, { status: 400 });
  }

  const conv = await prisma.conversacion.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!conv) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const empresa = await prisma.empresa.findFirst({ where: { id: ctx.empresaId, activo: true } });
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 403 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
  const path = `conversaciones/${ctx.empresaId}/${Date.now()}-${safeName}`;

  const blob = await put(path, buffer, {
    access: "public",
    contentType: mime,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  const publicUrl = blob.url;

  const tipo = tipoHilo(mime);
  const contenido = etiquetaContenido(tipo, file.name, caption);

  if (conv.canal === "WHATSAPP") {
    if (!empresa.whatsappPhoneId?.trim() || !empresa.whatsappToken?.trim()) {
      return NextResponse.json(
        { error: "WhatsApp no configurado: completá Phone ID y token en Configuración." },
        { status: 400 }
      );
    }
    const phoneNumberId = empresa.whatsappPhoneId.trim();
    const token = empresa.whatsappToken.trim();
    let kind = waMediaKind(mime);
    const mediaId = await subirMediaWhatsApp({
      phoneNumberId,
      accessToken: token,
      buffer,
      filename: safeName || "adjunto",
      mimeType: mime,
    });

    let res = await enviarMensajeWhatsAppMedia({
      phoneNumberId,
      accessToken: token,
      to: conv.numeroCliente,
      kind,
      mediaId,
      caption:
        kind === "image" || kind === "video" || kind === "document" ? caption || undefined : undefined,
      documentFilename: kind === "document" ? safeName || "adjunto" : undefined,
    });

    if (!res.ok && kind === "audio") {
      const errTxt = await res.text();
      const mediaIdDoc = await subirMediaWhatsApp({
        phoneNumberId,
        accessToken: token,
        buffer,
        filename: safeName || "audio.bin",
        mimeType: mime,
      });
      res = await enviarMensajeWhatsAppMedia({
        phoneNumberId,
        accessToken: token,
        to: conv.numeroCliente,
        kind: "document",
        mediaId: mediaIdDoc,
        caption: caption || undefined,
        documentFilename: safeName || "audio",
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: textoErrorGraphApi(errTxt || (await res.text())) },
          { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
        );
      }
      kind = "document";
    } else if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: textoErrorGraphApi(errBody || `Error al enviar (${res.status})`) },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    if (caption && kind === "audio") {
      const r2 = await enviarMensajeWhatsApp({
        phoneNumberId,
        accessToken: token,
        to: conv.numeroCliente,
        text: caption,
      });
      if (!r2.ok) {
        const t = await r2.text();
        return NextResponse.json({ error: textoErrorGraphApi(t) }, { status: 502 });
      }
    }

    if (caption && kind === "document" && mime.startsWith("audio/")) {
      const r2 = await enviarMensajeWhatsApp({
        phoneNumberId,
        accessToken: token,
        to: conv.numeroCliente,
        text: caption,
      });
      if (!r2.ok) {
        const t = await r2.text();
        return NextResponse.json({ error: textoErrorGraphApi(t) }, { status: 502 });
      }
    }
  } else if (conv.canal === "MESSENGER") {
    if (!empresa.metaPageToken?.trim()) {
      return NextResponse.json({ error: "Messenger no configurado (token de página)." }, { status: 400 });
    }
    const pageToken = empresa.metaPageToken.trim();
    const fbType = metaAdjuntoTipo(mime);
    let res = await enviarAdjuntoMessenger(pageToken, conv.numeroCliente, fbType, publicUrl);
    if (!res.ok && fbType === "audio") {
      res = await enviarAdjuntoMessenger(pageToken, conv.numeroCliente, "file", publicUrl);
    }
    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: textoErrorGraphApi(errBody || `Error al enviar (${res.status})`) },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }
    if (caption) {
      const r2 = await enviarMensajeMessenger(pageToken, conv.numeroCliente, caption);
      if (!r2.ok) {
        const t = await r2.text();
        return NextResponse.json({ error: textoErrorGraphApi(t) }, { status: 502 });
      }
    }
  } else if (conv.canal === "INSTAGRAM") {
    if (!empresa.metaPageToken?.trim() || !empresa.metaInstagramId?.trim()) {
      return NextResponse.json({ error: "Instagram no configurado." }, { status: 400 });
    }
    const pageToken = empresa.metaPageToken.trim();
    const igId = empresa.metaInstagramId.trim();
    const fbType = metaAdjuntoTipo(mime);
    let res = await enviarAdjuntoInstagram(pageToken, igId, conv.numeroCliente, fbType, publicUrl);
    if (!res.ok && fbType === "audio") {
      res = await enviarAdjuntoInstagram(pageToken, igId, conv.numeroCliente, "file", publicUrl);
    }
    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json(
        { error: textoErrorGraphApi(errBody || `Error al enviar (${res.status})`) },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }
    if (caption) {
      const r2 = await enviarMensajeInstagram(pageToken, igId, conv.numeroCliente, caption);
      if (!r2.ok) {
        const t = await r2.text();
        return NextResponse.json({ error: textoErrorGraphApi(t) }, { status: 502 });
      }
    }
  } else {
    return NextResponse.json({ error: "Canal no soportado" }, { status: 400 });
  }

  const prev = (Array.isArray(conv.mensajes) ? conv.mensajes : []) as unknown[];
  const staffMsg = {
    role: "staff",
    content: contenido,
    tipo,
    mediaUrl: publicUrl,
    archivoNombre: file.name,
    timestamp: new Date().toISOString(),
  };

  const updated = await prisma.conversacion.update({
    where: { id: conv.id },
    data: {
      mensajes: [...prev, staffMsg] as unknown as Prisma.InputJsonValue,
      ultimoMensaje: new Date(),
    },
    include: { agente: { select: { nombre: true, id: true, responsableHumano: true } } },
  });

  return NextResponse.json(updated);
}
