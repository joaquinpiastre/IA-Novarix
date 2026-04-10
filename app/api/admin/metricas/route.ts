import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/api-auth";
import { PLANES } from "@/lib/creditos";

/** Costo aproximado por token (promedio input/output gpt-4o-mini). */
const COSTO_POR_TOKEN_USD = 0.00000037;

export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const denied = requireRole(s.session, ["SUPERADMIN"]);
  if (denied) return denied;

  const clientes = await prisma.empresa.findMany({
    where: { rol: "CLIENTE" },
    select: { plan: true },
  });

  let revenueMensual = 0;
  for (const c of clientes) {
    revenueMensual += PLANES[c.plan].precioMensual;
  }

  const tokensAgg = await prisma.conversacion.aggregate({
    _sum: { tokensUsados: true },
  });
  const tokensTotal = tokensAgg._sum.tokensUsados ?? 0;
  const costoOpenAI = tokensTotal * COSTO_POR_TOKEN_USD;

  const totalConversaciones = await prisma.conversacion.count();

  const margenNeto = revenueMensual - costoOpenAI;

  return NextResponse.json({
    totalConversaciones,
    revenueMensualTotal: revenueMensual,
    costoOpenAITotal: costoOpenAI,
    margenNeto,
    empresasActivas: clientes.length,
  });
}
