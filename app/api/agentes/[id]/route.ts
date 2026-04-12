import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const agente = await prisma.agente.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
    include: {
      archivos: true,
      _count: { select: { conversaciones: true } },
    },
  });
  if (!agente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(agente);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const existing = await prisma.agente.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const { nombre, descripcion, prompt, esDefault, activo, codigoActivacion } = body as {
    nombre?: string;
    descripcion?: string;
    prompt?: string;
    esDefault?: boolean;
    activo?: boolean;
    codigoActivacion?: string | null;
  };

  if (esDefault) {
    await prisma.agente.updateMany({
      where: { empresaId: ctx.empresaId },
      data: { esDefault: false },
    });
  }

  const agente = await prisma.agente.update({
    where: { id: params.id },
    data: {
      ...(nombre != null && { nombre: nombre.trim() }),
      ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
      ...(prompt != null && { prompt: prompt.trim() }),
      ...(esDefault != null && { esDefault: !!esDefault }),
      ...(activo != null && { activo: !!activo }),
      ...(codigoActivacion !== undefined && {
        codigoActivacion: codigoActivacion?.trim() || null,
      }),
    },
  });
  return NextResponse.json(agente);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const existing = await prisma.agente.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (existing.esDefault) {
    const siguiente = await prisma.agente.findFirst({
      where: { empresaId: ctx.empresaId, id: { not: params.id } },
      orderBy: { creadoEn: "desc" },
    });
    await prisma.agente.updateMany({
      where: { empresaId: ctx.empresaId },
      data: { esDefault: false },
    });
    if (siguiente) {
      await prisma.agente.update({ where: { id: siguiente.id }, data: { esDefault: true } });
    }
  }

  await prisma.agente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
