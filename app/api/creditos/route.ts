import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { PLANES } from "@/lib/creditos";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const empresa = await prisma.empresa.findUnique({
    where: { id: ctx.empresaId },
  });
  if (!empresa) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const incluidos =
    empresa.plan === "BASIC"
      ? PLANES.BASIC.creditosIncluidos
      : empresa.plan === "PRO"
        ? PLANES.PRO.creditosIncluidos
        : PLANES.ENTERPRISE.creditosIncluidos;

  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const conversaciones = await prisma.conversacion.findMany({
    where: { empresaId: ctx.empresaId, ultimoMensaje: { gte: hace30 } },
    select: { creditosUsados: true, ultimoMensaje: true, agenteId: true },
  });

  const porDia = new Map<string, number>();
  for (const c of conversaciones) {
    const d = c.ultimoMensaje.toISOString().slice(0, 10);
    porDia.set(d, (porDia.get(d) ?? 0) + c.creditosUsados);
  }

  const porAgente = await prisma.conversacion.groupBy({
    by: ["agenteId"],
    where: { empresaId: ctx.empresaId, ultimoMensaje: { gte: hace30 } },
    _sum: { creditosUsados: true },
  });

  const agenteIds = porAgente.map((p) => p.agenteId).filter(Boolean) as string[];
  const agentes = await prisma.agente.findMany({
    where: { id: { in: agenteIds } },
    select: { id: true, nombre: true },
  });
  const nombres = Object.fromEntries(agentes.map((a) => [a.id, a.nombre]));

  return NextResponse.json({
    creditosIncluidos: empresa.creditosIncluidos || incluidos,
    creditosUsados: empresa.creditosUsados,
    plan: empresa.plan,
    porDia: Array.from(porDia.entries())
      .map(([fecha, total]) => ({ fecha, total }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    porAgente: porAgente.map((p) => ({
      agenteId: p.agenteId,
      nombre: p.agenteId ? nombres[p.agenteId] ?? "—" : "—",
      total: p._sum.creditosUsados ?? 0,
    })),
  });
}
