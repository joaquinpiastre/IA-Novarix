import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v18.0";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const empresa = await prisma.empresa.findUnique({
    where: { id: ctx.empresaId },
    select: { whatsappToken: true, whatsappWabaId: true },
  });

  if (!empresa?.whatsappToken || !empresa.whatsappWabaId) {
    return NextResponse.json(
      { error: "Configurá el WABA ID y el Access Token de WhatsApp en Configuración." },
      { status: 400 }
    );
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${empresa.whatsappWabaId}/message_templates?fields=name,status,category,language,components&limit=50`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${empresa.whatsappToken}` },
  });

  const json = await res.json();
  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } }).error?.message ??
      "Error al consultar Meta";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  return NextResponse.json(json);
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const empresa = await prisma.empresa.findUnique({
    where: { id: ctx.empresaId },
    select: { whatsappToken: true, whatsappWabaId: true },
  });

  if (!empresa?.whatsappToken || !empresa.whatsappWabaId) {
    return NextResponse.json(
      { error: "Configurá el WABA ID y el Access Token de WhatsApp en Configuración." },
      { status: 400 }
    );
  }

  const body = (await req.json()) as {
    name?: string;
    category?: string;
    language?: string;
    body_text?: string;
  };

  if (!body.name || !body.category || !body.language || !body.body_text) {
    return NextResponse.json({ error: "Faltan campos requeridos." }, { status: 400 });
  }

  const templateName = body.name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 512);

  const payload = {
    name: templateName,
    category: body.category,
    language: body.language,
    components: [
      {
        type: "BODY",
        text: body.body_text,
      },
    ],
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${empresa.whatsappWabaId}/message_templates`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${empresa.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } }).error?.message ??
      "Error al crear la plantilla";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  return NextResponse.json(json);
}
