import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import type { TipoDisparador } from "@prisma/client";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const [reglas, ultimos] = await Promise.all([
    prisma.reglaFollowUp.findMany({
      where: { empresaId: ctx.empresaId },
      orderBy: { creadoEn: "desc" },
    }),
    prisma.seguimientoEnviado.findMany({
      where: { contacto: { empresaId: ctx.empresaId } },
      orderBy: { creadoEn: "desc" },
      take: 50,
      include: {
        contacto: { select: { id: true, nombre: true, numero: true } },
        regla: { select: { nombre: true } },
      },
    }),
  ]);

  return NextResponse.json({ reglas, ultimos });
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json()) as {
    nombre?: string;
    disparador?: TipoDisparador;
    activa?: boolean;
    diasEnEtapa?: number | null;
    horasSinRespuesta?: number | null;
    etapaDisparoId?: string | null;
    usarIA?: boolean;
    promptMensaje?: string | null;
    mensajeFijo?: string | null;
    moverAEtapaId?: string | null;
  };

  if (!body.nombre?.trim() || !body.disparador) {
    return NextResponse.json({ error: "Nombre y disparador requeridos" }, { status: 400 });
  }

  const r = await prisma.reglaFollowUp.create({
    data: {
      empresaId: ctx.empresaId,
      nombre: body.nombre.trim(),
      disparador: body.disparador,
      activa: body.activa !== false,
      diasEnEtapa: body.diasEnEtapa ?? null,
      horasSinRespuesta: body.horasSinRespuesta ?? null,
      etapaDisparoId: body.etapaDisparoId ?? null,
      usarIA: body.usarIA !== false,
      promptMensaje: body.promptMensaje?.trim() || null,
      mensajeFijo: body.mensajeFijo?.trim() || null,
      moverAEtapaId: body.moverAEtapaId ?? null,
    },
  });
  return NextResponse.json(r);
}
