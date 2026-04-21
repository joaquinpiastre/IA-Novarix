import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import type { TipoDisparador } from "@prisma/client";
import { numerosIncluidosArray, parsearListaNumerosSeguimiento } from "@/lib/seguimientos";

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
    soloEstosNumeros?: boolean;
    numerosTexto?: string | null;
    omitirGanadosPerdidos?: boolean;
  };

  const data: Prisma.ReglaFollowUpUpdateInput = {
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
    ...(body.omitirGanadosPerdidos != null && { omitirGanadosPerdidos: body.omitirGanadosPerdidos }),
  };

  if (body.soloEstosNumeros !== undefined) {
    const lista =
      body.soloEstosNumeros === false
        ? []
        : parsearListaNumerosSeguimiento(
            body.numerosTexto ?? numerosIncluidosArray(existing.numerosIncluidos).join("\n")
          );
    if (body.soloEstosNumeros === true && lista.length === 0) {
      return NextResponse.json(
        { error: "Indicá al menos un teléfono o clave para reglas por lista." },
        { status: 400 }
      );
    }
    data.numerosIncluidos =
      body.soloEstosNumeros === true && lista.length > 0
        ? (lista as Prisma.InputJsonValue)
        : Prisma.JsonNull;
  }

  const r = await prisma.reglaFollowUp.update({
    where: { id: params.id },
    data,
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
