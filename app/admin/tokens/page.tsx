import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";

export default async function AdminTokensPage() {
  const agg = await prisma.conversacion.aggregate({ _sum: { tokensUsados: true, creditosUsados: true } });
  const porEmpresa = await prisma.conversacion.groupBy({
    by: ["empresaId"],
    _sum: { tokensUsados: true },
  });
  const empresas = await prisma.empresa.findMany({
    where: { id: { in: porEmpresa.map((p) => p.empresaId) } },
    select: { id: true, nombre: true },
  });
  const nombres = Object.fromEntries(empresas.map((e) => [e.id, e.nombre]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Uso de tokens</h1>
      <p className="mb-6 text-sm text-[#7C6FAE]">Consumo acumulado reportado por conversaciones.</p>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-[#C4B5FD]">Tokens totales (histórico)</p>
          <p className="mt-2 text-3xl font-bold text-white">{agg._sum.tokensUsados ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">Créditos usados (suma conversaciones)</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {(agg._sum.creditosUsados ?? 0).toFixed(1)}
          </p>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Por empresa</h2>
        <ul className="space-y-2 text-sm text-[#C4B5FD]">
          {porEmpresa
            .sort((a, b) => (b._sum.tokensUsados ?? 0) - (a._sum.tokensUsados ?? 0))
            .map((p) => (
              <li key={p.empresaId} className="flex justify-between border-b border-[#7B2FF7]/10 py-2">
                <span>{nombres[p.empresaId] ?? p.empresaId}</span>
                <span className="font-mono text-xs">{p._sum.tokensUsados ?? 0} tokens</span>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
