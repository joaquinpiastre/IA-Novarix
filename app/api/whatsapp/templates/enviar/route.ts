import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v18.0";

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const empresa = await prisma.empresa.findUnique({
    where: { id: ctx.empresaId },
    select: { whatsappToken: true, whatsappPhoneId: true },
  });

  if (!empresa?.whatsappToken || !empresa.whatsappPhoneId) {
    return NextResponse.json(
      { error: "Configurá el Phone Number ID y el Access Token de WhatsApp en Configuración." },
      { status: 400 }
    );
  }

  const body = (await req.json()) as {
    templateName?: string;
    languageCode?: string;
    to?: string;
  };

  if (!body.templateName || !body.to) {
    return NextResponse.json({ error: "Faltan campos requeridos (templateName, to)." }, { status: 400 });
  }

  const to = body.to.replace(/\D/g, "");
  if (!to || to.length < 7) {
    return NextResponse.json({ error: "Número de destino inválido." }, { status: 400 });
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: body.templateName,
      language: { code: body.languageCode ?? "es" },
    },
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${empresa.whatsappPhoneId}/messages`;
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
      "Error al enviar la plantilla";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  return NextResponse.json({ ok: true, data: json });
}
