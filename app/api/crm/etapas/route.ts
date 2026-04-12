import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { asegurarEtapasPorDefecto, crearEtapasPorDefecto } from "@/lib/crm";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  await asegurarEtapasPorDefecto(ctx.empresaId);

  const etapas = await prisma.etapaCRM.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { orden: "asc" },
  });
  return NextResponse.json(etapas);
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json()) as {
    nombre?: string;
    color?: string;
    orden?: number;
    esGanado?: boolean;
    esPerdido?: boolean;
  };

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const maxOrden = await prisma.etapaCRM.aggregate({
    where: { empresaId: ctx.empresaId },
    _max: { orden: true },
  });
  const orden = body.orden ?? (maxOrden._max.orden ?? -1) + 1;

  if (body.esGanado) {
    await prisma.etapaCRM.updateMany({
      where: { empresaId: ctx.empresaId, esGanado: true },
      data: { esGanado: false },
    });
  }
  if (body.esPerdido) {
    await prisma.etapaCRM.updateMany({
      where: { empresaId: ctx.empresaId, esPerdido: true },
      data: { esPerdido: false },
    });
  }

  const e = await prisma.etapaCRM.create({
    data: {
      empresaId: ctx.empresaId,
      nombre: body.nombre.trim(),
      color: body.color?.trim() || "#7B2FF7",
      orden,
      esGanado: !!body.esGanado,
      esPerdido: !!body.esPerdido,
    },
  });
  return NextResponse.json(e);
}

/** Body: { ordenIds: string[] } — reordenar etapas */
export async function PATCH(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json()) as { ordenIds?: string[]; restaurarDefecto?: boolean };

  if (body.restaurarDefecto) {
    await prisma.$transaction([
      prisma.contacto.updateMany({
        where: { empresaId: ctx.empresaId },
        data: { etapaId: null },
      }),
      prisma.historialEtapa.deleteMany({
        where: { contacto: { empresaId: ctx.empresaId } },
      }),
      prisma.etapaCRM.deleteMany({ where: { empresaId: ctx.empresaId } }),
    ]);
    await crearEtapasPorDefecto(ctx.empresaId);
    const etapas = await prisma.etapaCRM.findMany({
      where: { empresaId: ctx.empresaId },
      orderBy: { orden: "asc" },
    });
    return NextResponse.json(etapas);
  }

  if (!body.ordenIds?.length) {
    return NextResponse.json({ error: "ordenIds requerido" }, { status: 400 });
  }

  for (let i = 0; i < body.ordenIds.length; i++) {
    const id = body.ordenIds[i];
    const ok = await prisma.etapaCRM.findFirst({
      where: { id, empresaId: ctx.empresaId },
    });
    if (ok) await prisma.etapaCRM.update({ where: { id }, data: { orden: i } });
  }

  const etapas = await prisma.etapaCRM.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { orden: "asc" },
  });
  return NextResponse.json(etapas);
}
