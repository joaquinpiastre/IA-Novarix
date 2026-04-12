import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import type { TipoDisparador } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.reglaFollowUp.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = (await req.json()) as {
    nombre?: string;
    activa?: boolean;
    disparador?: TipoDisparador;
    diasEnEtapa?: number | null;
    horasSinRespuesta?: number | null;
    etapaDisparoId?: string | null;
    usarIA?: boolean;
    promptMensaje?: string | null;
    mensajeFijo?: string | null;
    moverAEtapaId?: string | null;
  };

  const r = await prisma.reglaFollowUp.update({
    where: { id: params.id },
    data: {
      ...(body.nombre != null && { nombre: body.nombre.trim() }),
      ...(body.activa != null && { activa: body.activa }),
      ...(body.disparador != null && { disparador: body.disparador }),
      ...(body.diasEnEtapa !== undefined && { diasEnEtapa: body.diasEnEtapa }),
      ...(body.horasSinRespuesta !== undefined && { horasSinRespuesta: body.horasSinRespuesta }),
      ...(body.etapaDisparoId !== undefined && { etapaDisparoId: body.etapaDisparoId }),
      ...(body.usarIA != null && { usarIA: body.usarIA }),
      ...(body.promptMensaje !== undefined && { promptMensaje: body.promptMensaje?.trim() || null }),
      ...(body.mensajeFijo !== undefined && { mensajeFijo: body.mensajeFijo?.trim() || null }),
      ...(body.moverAEtapaId !== undefined && { moverAEtapaId: body.moverAEtapaId }),
    },
  });
  return NextResponse.json(r);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const existing = await prisma.reglaFollowUp.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.reglaFollowUp.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
