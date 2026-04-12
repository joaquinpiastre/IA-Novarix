import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { asegurarEtapasPorDefecto } from "@/lib/crm";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  await asegurarEtapasPorDefecto(ctx.empresaId);

  const contactos = await prisma.contacto.findMany({
    where: { empresaId: ctx.empresaId },
    include: { etapa: true },
    orderBy: { ultimaInteraccion: "desc" },
  });
  return NextResponse.json(contactos);
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  await asegurarEtapasPorDefecto(ctx.empresaId);

  const body = (await req.json()) as {
    numero?: string;
    nombre?: string;
    email?: string;
    empresaCliente?: string;
    etapaId?: string | null;
    valorOportunidad?: number | null;
    notas?: string | null;
  };

  const num = body.numero?.replace(/\D/g, "") || body.numero?.trim();
  if (!num?.trim()) {
    return NextResponse.json({ error: "Número requerido" }, { status: 400 });
  }

  const existe = await prisma.contacto.findUnique({
    where: { empresaId_numero: { empresaId: ctx.empresaId, numero: num } },
  });
  if (existe) {
    return NextResponse.json({ error: "Ya existe un contacto con ese número" }, { status: 409 });
  }

  const etapaId =
    body.etapaId ??
    (
      await prisma.etapaCRM.findFirst({
        where: { empresaId: ctx.empresaId },
        orderBy: { orden: "asc" },
      })
    )?.id;

  const c = await prisma.contacto.create({
    data: {
      empresaId: ctx.empresaId,
      numero: num,
      nombre: body.nombre?.trim() || null,
      email: body.email?.trim() || null,
      empresaCliente: body.empresaCliente?.trim() || null,
      etapaId: etapaId ?? null,
      valorOportunidad: body.valorOportunidad ?? null,
      notas: body.notas?.trim() || null,
      origen: "MANUAL",
    },
    include: { etapa: true },
  });

  return NextResponse.json(c);
}
