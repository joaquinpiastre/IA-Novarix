import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import type { TipoDisparador } from "@prisma/client";
import { parsearListaNumerosSeguimiento } from "@/lib/seguimientos";

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
    soloEstosNumeros?: boolean;
    numerosTexto?: string | null;
    omitirGanadosPerdidos?: boolean;
  };

  if (!body.nombre?.trim() || !body.disparador) {
    return NextResponse.json({ error: "Nombre y disparador requeridos" }, { status: 400 });
  }

  const listaNumeros = parsearListaNumerosSeguimiento(body.numerosTexto ?? "");
  if (body.soloEstosNumeros === true && listaNumeros.length === 0) {
    return NextResponse.json(
      { error: "Indicá al menos un teléfono o clave (podés usar m: o ig: para Meta)." },
      { status: 400 }
    );
  }

  const numerosIncluidos: Prisma.InputJsonValue | typeof Prisma.JsonNull =
    body.soloEstosNumeros === true && listaNumeros.length > 0
      ? (listaNumeros as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  const r = await prisma.reglaFollowUp.create({
    data: {
      empresaId: ctx.empresaId,
      nombre: body.nombre.trim(),
      disparador: body.disparador,
      activa: body.activa !== false,
      diasEnEtapa: body.diasEnEtapa ?? null,
      horasSinRespuesta: body.horasSinRespuesta ?? null,
      etapaDisparoId: body.etapaDisparoId ?? null,
      numerosIncluidos,
      omitirGanadosPerdidos: body.omitirGanadosPerdidos !== false,
      usarIA: body.usarIA !== false,
      promptMensaje: body.promptMensaje?.trim() || null,
      mensajeFijo: body.mensajeFijo?.trim() || null,
      moverAEtapaId: body.moverAEtapaId ?? null,
    },
  });
  return NextResponse.json(r);
}
