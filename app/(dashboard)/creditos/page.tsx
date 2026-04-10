import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PLANES, PRECIO_CREDITO_EXTRA } from "@/lib/creditos";

const WHATSAPP_NOVARIX =
  "https://wa.me/5492610000000?text=" +
  encodeURIComponent("Hola Novarix, quiero comprar créditos extra en Novarix AI Platform.");

export default async function CreditosPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return null;

  const incluidos =
    empresa.plan === "ENTERPRISE"
      ? PLANES.ENTERPRISE.creditosIncluidos
      : empresa.plan === "PRO"
        ? PLANES.PRO.creditosIncluidos
        : PLANES.BASIC.creditosIncluidos;

  const total = empresa.creditosIncluidos || incluidos;
  const usados = empresa.creditosUsados;
  const restantes = Math.max(0, total - usados);
  const pct = total > 0 ? Math.min(100, (usados / total) * 100) : 0;

  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const conversaciones = await prisma.conversacion.findMany({
    where: { empresaId, ultimoMensaje: { gte: hace30 } },
    select: { ultimoMensaje: true, creditosUsados: true, agenteId: true },
  });

  const porDia = new Map<string, number>();
  for (const c of conversaciones) {
    const d = c.ultimoMensaje.toISOString().slice(0, 10);
    porDia.set(d, (porDia.get(d) ?? 0) + c.creditosUsados);
  }
  const tablaDia = Array.from(porDia.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30);

  const porAgente = await prisma.conversacion.groupBy({
    by: ["agenteId"],
    where: { empresaId, ultimoMensaje: { gte: hace30 } },
    _sum: { creditosUsados: true },
  });
  const ids = porAgente.map((p) => p.agenteId).filter(Boolean) as string[];
  const agentes = await prisma.agente.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombre: true },
  });
  const nombres = Object.fromEntries(agentes.map((a) => [a.id, a.nombre]));

  return (
    <PageShell title="Créditos y consumo">
      <Card className="mb-8">
        <p className="text-sm text-[#C4B5FD]">Créditos restantes (aprox. este ciclo)</p>
        <p className="mt-2 bg-gradient-to-r from-[#7B2FF7] to-[#C026D3] bg-clip-text text-4xl font-bold text-transparent">
          {restantes.toFixed(1)}
        </p>
        <p className="mt-1 text-xs text-[#7C6FAE]">
          Usados: {usados.toFixed(2)} · Incluidos en plan: {total} · Crédito extra ~ USD{" "}
          {PRECIO_CREDITO_EXTRA.toFixed(2)}
        </p>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#0A0118]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7B2FF7] to-[#A855F7]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Link href={WHATSAPP_NOVARIX} target="_blank" rel="noreferrer" className="mt-6 inline-block">
          <Button type="button">Comprar créditos extra</Button>
        </Link>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Consumo por día (30 días)</h2>
          <div className="max-h-64 overflow-auto text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[#7C6FAE]">
                  <th className="pb-2 pr-4">Fecha</th>
                  <th className="pb-2">Créditos</th>
                </tr>
              </thead>
              <tbody className="text-[#C4B5FD]">
                {tablaDia.map(([fecha, tot]) => (
                  <tr key={fecha} className="border-t border-[#7B2FF7]/10">
                    <td className="py-2 pr-4">{fecha}</td>
                    <td className="py-2">{tot.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tablaDia.length ? <p className="text-[#7C6FAE]">Sin datos.</p> : null}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Desglose por agente</h2>
          <ul className="space-y-2 text-sm text-[#C4B5FD]">
            {porAgente.map((p) => (
              <li key={p.agenteId ?? "none"} className="flex justify-between border-b border-[#7B2FF7]/10 py-2">
                <span>{p.agenteId ? nombres[p.agenteId] ?? "—" : "—"}</span>
                <span>{(p._sum.creditosUsados ?? 0).toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
