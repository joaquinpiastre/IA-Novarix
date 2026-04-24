import { NextResponse } from "next/server";
import type { CanalConversacion, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { obtenerOCrearContacto } from "@/lib/crm";
import { enviarMensajeWhatsApp } from "@/lib/whatsapp";
import { enviarMensajeInstagram, enviarMensajeMessenger, textoErrorGraphApi } from "@/lib/meta-graph";

export async function GET(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const { searchParams } = new URL(req.url);
  const agenteId = searchParams.get("agenteId") || undefined;
  const estado = searchParams.get("estado") as
    | "ACTIVA"
    | "RESUELTA"
    | "DERIVADA_HUMANO"
    | undefined;
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const todas = searchParams.get("todas") === "1";

  const where: Prisma.ConversacionWhereInput = {
    empresaId: ctx.empresaId,
    ...(!todas && agenteId ? { agenteId } : {}),
    ...(!todas && estado ? { estado } : {}),
    ...(!todas && (desde || hasta)
      ? {
          ultimoMensaje: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta) } : {}),
          },
        }
      : {}),
  };

  const list = await prisma.conversacion.findMany({
    where,
    include: { agente: { select: { nombre: true, responsableHumano: true } } },
    orderBy: { ultimoMensaje: "desc" },
    take: todas ? 500 : 200,
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json().catch(() => null)) as
    | {
        canal?: CanalConversacion;
        numeroCliente?: string;
        nombreCliente?: string | null;
        texto?: string;
      }
    | null;
  const canal = body?.canal ?? "WHATSAPP";
  const numeroRaw = body?.numeroCliente?.trim() ?? "";
  const numeroCliente = numeroRaw.replace(/\s+/g, "");
  const texto = body?.texto?.trim() ?? "";
  const nombreCliente = body?.nombreCliente?.trim() || null;

  if (!numeroCliente) {
    return NextResponse.json({ error: "numeroCliente requerido" }, { status: 400 });
  }
  if (!texto) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }
  const empresa = await prisma.empresa.findFirst({ where: { id: ctx.empresaId, activo: true } });
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 403 });
  if (canal === "WHATSAPP" && (!empresa.whatsappPhoneId?.trim() || !empresa.whatsappToken?.trim())) {
    return NextResponse.json(
      { error: "WhatsApp no configurado: completá Phone ID y token en Configuración." },
      { status: 400 }
    );
  }
  if (canal === "MESSENGER" && !empresa.metaPageToken?.trim()) {
    return NextResponse.json({ error: "Messenger no configurado (token de página)." }, { status: 400 });
  }
  if (canal === "INSTAGRAM" && (!empresa.metaPageToken?.trim() || !empresa.metaInstagramId?.trim())) {
    return NextResponse.json({ error: "Instagram no configurado." }, { status: 400 });
  }

  const origen = canal === "WHATSAPP" ? "WHATSAPP" : canal === "MESSENGER" ? "FACEBOOK" : "INSTAGRAM";
  const contacto = await obtenerOCrearContacto(ctx.empresaId, numeroCliente, nombreCliente, origen);
  const agente =
    (await prisma.agente.findFirst({
      where: { empresaId: ctx.empresaId, activo: true, esDefault: true },
      select: { id: true },
    })) ??
    (await prisma.agente.findFirst({
      where: { empresaId: ctx.empresaId, activo: true },
      select: { id: true },
    }));

  let conv = await prisma.conversacion.findFirst({
    where: { empresaId: ctx.empresaId, numeroCliente, canal },
    orderBy: { ultimoMensaje: "desc" },
  });
  if (!conv) {
    conv = await prisma.conversacion.create({
      data: {
        empresaId: ctx.empresaId,
        agenteId: agente?.id ?? null,
        numeroCliente,
        nombreCliente,
        canal,
        esGrupo: false,
        contactoId: contacto.id,
        mensajes: [],
      },
    });
  }

  let res: Response;
  if (canal === "WHATSAPP") {
    res = await enviarMensajeWhatsApp({
      phoneNumberId: empresa.whatsappPhoneId!.trim(),
      accessToken: empresa.whatsappToken!.trim(),
      to: numeroCliente,
      text: texto,
    });
  } else if (canal === "MESSENGER") {
    res = await enviarMensajeMessenger(empresa.metaPageToken!.trim(), numeroCliente, texto);
  } else {
    res = await enviarMensajeInstagram(
      empresa.metaPageToken!.trim(),
      empresa.metaInstagramId!.trim(),
      numeroCliente,
      texto
    );
  }
  const errBody = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: textoErrorGraphApi(errBody || `Error al enviar (${res.status})`) },
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
      nombreCliente,
      contactoId: contacto.id,
      mensajes: [...prev, staffMsg] as unknown as Prisma.InputJsonValue,
      ultimoMensaje: new Date(),
    },
    include: { agente: { select: { nombre: true, responsableHumano: true } } },
  });
  return NextResponse.json(updated);
}
