import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireEmpresaContext, requireSession } from "@/lib/api-auth";
import { enviarMensajeWhatsApp } from "@/lib/whatsapp";
import { obtenerTextoCatalogoExterno } from "@/lib/stock-api";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const empresa = await prisma.empresa.findUnique({
    where: { id: ctx.empresaId },
    select: {
      id: true,
      nombre: true,
      email: true,
      whatsappPhoneId: true,
      whatsappToken: true,
      whatsappVerifyToken: true,
      whatsappNumero: true,
      plan: true,
      creditosIncluidos: true,
      creditosUsados: true,
      stockApiUrl: true,
      stockApiKeyHeader: true,
      stockApiToken: true,
      cotizacionIncluyeGrupos: true,
      metaPageId: true,
      metaPageNombre: true,
      metaInstagramUsername: true,
      metaInstagramId: true,
      metaConectadoEn: true,
      chatIaPausado: true,
    },
  });
  if (!empresa) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({
    ...empresa,
    whatsappToken: empresa.whatsappToken ? "••••••••" : null,
    stockApiToken: empresa.stockApiToken ? "••••••••" : null,
    metaVinculado: !!empresa.metaPageId,
  });
}

export async function PUT(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const body = await req.json();
  const {
    nombre,
    whatsappPhoneId,
    whatsappToken,
    whatsappVerifyToken,
    whatsappNumero,
    stockApiUrl,
    stockApiToken,
    stockApiKeyHeader,
    cotizacionIncluyeGrupos,
    chatIaPausado,
  } = body as {
    nombre?: string;
    whatsappPhoneId?: string | null;
    whatsappToken?: string | null;
    whatsappVerifyToken?: string | null;
    whatsappNumero?: string | null;
    stockApiUrl?: string | null;
    stockApiToken?: string | null;
    stockApiKeyHeader?: string | null;
    cotizacionIncluyeGrupos?: boolean;
    chatIaPausado?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (nombre != null) data.nombre = nombre.trim();
  if (whatsappPhoneId !== undefined) data.whatsappPhoneId = whatsappPhoneId?.trim() || null;
  if (whatsappVerifyToken !== undefined) data.whatsappVerifyToken = whatsappVerifyToken?.trim() || null;
  if (whatsappNumero !== undefined) data.whatsappNumero = whatsappNumero?.trim() || null;
  if (whatsappToken !== undefined && whatsappToken && !whatsappToken.startsWith("••")) {
    data.whatsappToken = whatsappToken.trim();
  }
  if (stockApiUrl !== undefined) data.stockApiUrl = stockApiUrl?.trim() || null;
  if (stockApiKeyHeader !== undefined) data.stockApiKeyHeader = stockApiKeyHeader?.trim() || null;
  if (stockApiToken !== undefined && stockApiToken && !stockApiToken.startsWith("••")) {
    data.stockApiToken = stockApiToken.trim();
  }
  if (typeof cotizacionIncluyeGrupos === "boolean") data.cotizacionIncluyeGrupos = cotizacionIncluyeGrupos;
  if (typeof chatIaPausado === "boolean") data.chatIaPausado = chatIaPausado;

  const empresa = await prisma.empresa.update({
    where: { id: ctx.empresaId },
    data: data as Parameters<typeof prisma.empresa.update>[0]["data"],
    select: {
      nombre: true,
      whatsappPhoneId: true,
      whatsappToken: true,
      whatsappVerifyToken: true,
      stockApiUrl: true,
      stockApiKeyHeader: true,
      stockApiToken: true,
    },
  });
  return NextResponse.json({
    ...empresa,
    whatsappToken: empresa.whatsappToken ? "••••••••" : null,
    stockApiToken: empresa.stockApiToken ? "••••••••" : null,
  });
}

export async function POST(req: Request) {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const body = await req.json();
  if (body?.action === "change-password") {
    const { actual, nueva } = body as { actual?: string; nueva?: string };
    if (!actual || !nueva || nueva.length < 8) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const emp = await prisma.empresa.findUnique({ where: { id: s.session.user.empresaId } });
    if (!emp) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    const ok = await bcrypt.compare(actual, emp.passwordHash);
    if (!ok) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
    const passwordHash = await bcrypt.hash(nueva, 12);
    await prisma.empresa.update({
      where: { id: emp.id },
      data: { passwordHash },
    });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "probar-whatsapp") {
    const ctx = await requireEmpresaContext();
    if ("error" in ctx) return ctx.error;
    const emp = await prisma.empresa.findUnique({ where: { id: ctx.empresaId } });
    if (!emp?.whatsappToken || !emp.whatsappPhoneId || !emp.whatsappNumero) {
      return NextResponse.json({ error: "Configurá token, phone id y número de prueba" }, { status: 400 });
    }
    const r = await enviarMensajeWhatsApp({
      phoneNumberId: emp.whatsappPhoneId,
      accessToken: emp.whatsappToken,
      to: emp.whatsappNumero.replace(/\D/g, ""),
      text: "Novarix AI Platform: conexión OK.",
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ error: j.error?.message ?? "Falló el envío" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "probar-stock-api") {
    const ctx = await requireEmpresaContext();
    if ("error" in ctx) return ctx.error;
    const emp = await prisma.empresa.findUnique({ where: { id: ctx.empresaId } });
    if (!emp?.stockApiUrl?.trim()) {
      return NextResponse.json({ error: "Configurá la URL de la API de stock" }, { status: 400 });
    }
    const texto = await obtenerTextoCatalogoExterno(emp);
    if (!texto) {
      return NextResponse.json({
        error:
          "La API respondió vacío o falló la conexión (URL, token, firewall o certificado SSL). Si el ERP solo acepta IPs fijas, permití el servidor donde corre Novarix.",
      });
    }
    return NextResponse.json({
      ok: true,
      preview: texto.slice(0, 1200),
      totalChars: texto.length,
    });
  }
  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
