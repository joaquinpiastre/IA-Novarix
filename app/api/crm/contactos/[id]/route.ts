import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { moverContactoEtapa } from "@/lib/crm";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const contacto = await prisma.contacto.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
    include: {
      etapa: true,
      conversaciones: { orderBy: { ultimoMensaje: "desc" }, take: 20 },
      historialEtapas: { orderBy: { cambiadoEn: "desc" }, take: 50 },
      seguimientos: {
        orderBy: { creadoEn: "desc" },
        take: 30,
        include: { regla: { select: { nombre: true } } },
      },
    },
  });

  if (!contacto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(contacto);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.contacto.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = (await req.json()) as {
    nombre?: string;
    email?: string;
    empresaCliente?: string;
    etapaId?: string | null;
    valorOportunidad?: number | null;
    notas?: string | null;
    proximoSeguimiento?: string | null;
  };

  if (body.etapaId !== undefined && body.etapaId !== existing.etapaId) {
    if (body.etapaId) {
      const et = await prisma.etapaCRM.findFirst({
        where: { id: body.etapaId, empresaId: ctx.empresaId },
      });
      if (!et) return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
      await moverContactoEtapa(existing.id, body.etapaId);
    } else {
      await prisma.historialEtapa.create({
        data: {
          contactoId: existing.id,
          etapaAnterior: existing.etapaId ?? null,
          etapaNueva: "sin_etapa",
        },
      });
      await prisma.contacto.update({
        where: { id: existing.id },
        data: { etapaId: null },
      });
    }
  }

  const updated = await prisma.contacto.update({
    where: { id: params.id },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre?.trim() || null }),
      ...(body.email !== undefined && { email: body.email?.trim() || null }),
      ...(body.empresaCliente !== undefined && { empresaCliente: body.empresaCliente?.trim() || null }),
      ...(body.valorOportunidad !== undefined && { valorOportunidad: body.valorOportunidad }),
      ...(body.notas !== undefined && { notas: body.notas?.trim() || null }),
      ...(body.proximoSeguimiento !== undefined && {
        proximoSeguimiento: body.proximoSeguimiento ? new Date(body.proximoSeguimiento) : null,
      }),
    },
    include: { etapa: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.contacto.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.contacto.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
