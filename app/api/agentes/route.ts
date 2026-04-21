import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const agentes = await prisma.agente.findMany({
    where: { empresaId: ctx.empresaId },
    include: {
      _count: { select: { conversaciones: true } },
    },
    orderBy: { creadoEn: "desc" },
  });
  return NextResponse.json(agentes);
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const body = await req.json();
  const { nombre, descripcion, prompt, esDefault, activo, codigoActivacion, responsableHumano } = body as {
    nombre?: string;
    descripcion?: string;
    prompt?: string;
    esDefault?: boolean;
    activo?: boolean;
    codigoActivacion?: string | null;
    responsableHumano?: string | null;
  };
  if (!nombre?.trim() || !prompt?.trim()) {
    return NextResponse.json({ error: "Nombre y prompt son obligatorios" }, { status: 400 });
  }
  if (esDefault) {
    await prisma.agente.updateMany({
      where: { empresaId: ctx.empresaId },
      data: { esDefault: false },
    });
  }
  const agente = await prisma.agente.create({
    data: {
      empresaId: ctx.empresaId,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      prompt: prompt.trim(),
      esDefault: !!esDefault,
      activo: activo !== false,
      codigoActivacion: codigoActivacion?.trim() || null,
      responsableHumano: responsableHumano?.trim() || null,
    },
  });
  return NextResponse.json(agente);
}
