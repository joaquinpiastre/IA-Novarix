import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

export async function GET(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const { searchParams } = new URL(req.url);
  const agenteId = searchParams.get("agenteId") || undefined;
  const estado = searchParams.get("estado") as
    | "ACTIVA"
    | "RESUELTA"
    | "DERIVADA_HUMANO"
    | undefined;
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const todas = searchParams.get("todas") === "1";

  const where: Prisma.ConversacionWhereInput = {
    empresaId: ctx.empresaId,
    ...(!todas && agenteId ? { agenteId } : {}),
    ...(!todas && estado ? { estado } : {}),
    ...(!todas && (desde || hasta)
      ? {
          ultimoMensaje: {
            ...(desde ? { gte: new Date(desde) } : {}),
            ...(hasta ? { lte: new Date(hasta) } : {}),
          },
        }
      : {}),
  };

  const list = await prisma.conversacion.findMany({
    where,
    include: { agente: { select: { nombre: true } } },
    orderBy: { ultimoMensaje: "desc" },
    take: todas ? 500 : 200,
  });
  return NextResponse.json(list);
}
