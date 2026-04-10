import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default async function DashboardHomePage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  const startMonth = new Date();
  startMonth.setDate(1);
  startMonth.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return null;

  const [conversacionesMes, mensajesHoy, agentesActivos, ultimas] = await Promise.all([
    prisma.conversacion.count({
      where: { empresaId, iniciadoEn: { gte: startMonth } },
    }),
    prisma.conversacion.count({
      where: { empresaId, ultimoMensaje: { gte: today } },
    }),
    prisma.agente.count({ where: { empresaId, activo: true } }),
    prisma.conversacion.findMany({
      where: { empresaId },
      orderBy: { ultimoMensaje: "desc" },
      take: 5,
      include: { agente: { select: { nombre: true } } },
    }),
  ]);

  const creditosTotal = empresa.creditosIncluidos;
  const pct =
    creditosTotal > 0 ? Math.min(100, (empresa.creditosUsados / creditosTotal) * 100) : 0;

  const chartDays: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const label = d.toISOString().slice(0, 10);
    const count = await prisma.conversacion.count({
      where: {
        empresaId,
        iniciadoEn: {
          gte: d,
          lt: new Date(d.getTime() + 86400000),
        },
      },
    });
    chartDays.push({ label: label.slice(5), count });
  }

  const maxBar = Math.max(1, ...chartDays.map((c) => c.count));

  return (
    <PageShell title="Inicio">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-[#C4B5FD]">Créditos este mes</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {empresa.creditosUsados.toFixed(1)} / {creditosTotal}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0A0118]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7B2FF7] to-[#A855F7]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">Conversaciones del mes</p>
          <p className="mt-2 text-2xl font-bold text-white">{conversacionesMes}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">Conversaciones con actividad hoy</p>
          <p className="mt-2 text-2xl font-bold text-white">{mensajesHoy}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">Agentes activos</p>
          <p className="mt-2 text-2xl font-bold text-white">{agentesActivos}</p>
        </Card>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Conversaciones (últimos 7 días)</h2>
          <div className="flex h-40 items-end gap-2">
            {chartDays.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-[#7B2FF7] to-[#C026D3]"
                  style={{ height: `${(d.count / maxBar) * 100}%`, minHeight: d.count ? 8 : 2 }}
                  title={`${d.count}`}
                />
                <span className="text-[10px] text-[#7C6FAE]">{d.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Últimas conversaciones</h2>
          <ul className="space-y-3">
            {ultimas.map((c) => {
              const msgs = c.mensajes as { role?: string; content?: string }[];
              const last = msgs[msgs.length - 1]?.content ?? "—";
              return (
                <li key={c.id}>
                  <Link
                    href={`/conversaciones/${c.id}`}
                    className="block rounded-lg border border-[#7B2FF7]/20 bg-[#0A0118]/40 p-3 hover:border-[#7B2FF7]/40"
                  >
                    <p className="text-sm font-medium text-white">{c.numeroCliente}</p>
                    <p className="truncate text-xs text-[#7C6FAE]">{last}</p>
                    <p className="mt-1 text-xs text-[#C4B5FD]">
                      {c.agente?.nombre ?? "Sin agente"} ·{" "}
                      {new Date(c.ultimoMensaje).toLocaleString("es-AR")}
                    </p>
                  </Link>
                </li>
              );
            })}
            {!ultimas.length ? (
              <p className="text-sm text-[#7C6FAE]">Todavía no hay conversaciones.</p>
            ) : null}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
