import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.etapaCRM.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = (await req.json()) as {
    nombre?: string;
    color?: string;
    esGanado?: boolean;
    esPerdido?: boolean;
  };

  if (body.esGanado === true) {
    await prisma.etapaCRM.updateMany({
      where: { empresaId: ctx.empresaId, esGanado: true, NOT: { id: params.id } },
      data: { esGanado: false },
    });
  }
  if (body.esPerdido === true) {
    await prisma.etapaCRM.updateMany({
      where: { empresaId: ctx.empresaId, esPerdido: true, NOT: { id: params.id } },
      data: { esPerdido: false },
    });
  }

  const e = await prisma.etapaCRM.update({
    where: { id: params.id },
    data: {
      ...(body.nombre != null && { nombre: body.nombre.trim() }),
      ...(body.color != null && { color: body.color.trim() }),
      ...(body.esGanado != null && { esGanado: body.esGanado }),
      ...(body.esPerdido != null && { esPerdido: body.esPerdido }),
    },
  });
  return NextResponse.json(e);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.etapaCRM.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const moverA = searchParams.get("moverContactosA");
  if (!moverA) {
    return NextResponse.json({ error: "Query moverContactosA requerida (id de etapa destino)" }, { status: 400 });
  }

  const dest = await prisma.etapaCRM.findFirst({
    where: { id: moverA, empresaId: ctx.empresaId },
  });
  if (!dest) return NextResponse.json({ error: "Etapa destino inválida" }, { status: 400 });

  await prisma.contacto.updateMany({
    where: { empresaId: ctx.empresaId, etapaId: params.id },
    data: { etapaId: moverA },
  });

  await prisma.etapaCRM.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
