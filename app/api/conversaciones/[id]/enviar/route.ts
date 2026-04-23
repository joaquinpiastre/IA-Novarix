import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { enviarMensajeWhatsApp } from "@/lib/whatsapp";
import { enviarMensajeInstagram, enviarMensajeMessenger } from "@/lib/meta-graph";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json().catch(() => null)) as { texto?: string } | null;
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!texto) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  const conv = await prisma.conversacion.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!conv) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const empresa = await prisma.empresa.findFirst({ where: { id: ctx.empresaId, activo: true } });
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 403 });

  let res: Response;
  if (conv.canal === "WHATSAPP") {
    if (!empresa.whatsappPhoneId?.trim() || !empresa.whatsappToken?.trim()) {
      return NextResponse.json(
        { error: "WhatsApp no configurado: completá Phone ID y token en Configuración." },
        { status: 400 }
      );
    }
    res = await enviarMensajeWhatsApp({
      phoneNumberId: empresa.whatsappPhoneId.trim(),
      accessToken: empresa.whatsappToken.trim(),
      to: conv.numeroCliente,
      text: texto,
    });
  } else if (conv.canal === "MESSENGER") {
    if (!empresa.metaPageToken?.trim()) {
      return NextResponse.json({ error: "Messenger no configurado (token de página)." }, { status: 400 });
    }
    res = await enviarMensajeMessenger(empresa.metaPageToken.trim(), conv.numeroCliente, texto);
  } else if (conv.canal === "INSTAGRAM") {
    if (!empresa.metaPageToken?.trim() || !empresa.metaInstagramId?.trim()) {
      return NextResponse.json({ error: "Instagram no configurado." }, { status: 400 });
    }
    res = await enviarMensajeInstagram(
      empresa.metaPageToken.trim(),
      empresa.metaInstagramId.trim(),
      conv.numeroCliente,
      texto
    );
  } else {
    return NextResponse.json({ error: "Canal no soportado" }, { status: 400 });
  }

  const errBody = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: errBody || `Error al enviar (${res.status})` },
      { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
    );
  }

  const prev = (Array.isArray(conv.mensajes) ? conv.mensajes : []) as unknown[];
  const staffMsg = {
    role: "staff",
    content: texto,
    tipo: "text",
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
