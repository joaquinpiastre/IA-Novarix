import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { cerrarConexion, iniciarConexion } from "@/lib/baileys-client";

type Params = { params: { empresaId: string } };

function validarEmpresa(ctxEmpresaId: string, paramEmpresaId: string) {
  return ctxEmpresaId === paramEmpresaId;
}

export async function GET(_: Request, { params }: Params) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  if (!validarEmpresa(ctx.empresaId, params.empresaId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: params.empresaId },
    select: { whatsappQRConectado: true, whatsappQRCode: true },
  });
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  return NextResponse.json({ conectado: empresa.whatsappQRConectado, qr: empresa.whatsappQRCode });
}

export async function POST(_: Request, { params }: Params) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  if (!validarEmpresa(ctx.empresaId, params.empresaId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await iniciarConexion(params.empresaId, () => undefined);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Params) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  if (!validarEmpresa(ctx.empresaId, params.empresaId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await cerrarConexion(params.empresaId);
  return NextResponse.json({ ok: true });
}
