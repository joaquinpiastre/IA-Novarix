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
    return NextResponse.json({ error: "No configurado" }, { status: 400 });
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${empresa.whatsappWabaId}?fields=name,currency,message_template_namespace,on_behalf_of_business_info`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${empresa.whatsappToken}` },
  });

  const json = await res.json();
  if (!res.ok) {
    return NextResponse.json(json, { status: res.status });
  }
  return NextResponse.json(json);
}
