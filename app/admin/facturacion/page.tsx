import { prisma } from "@/lib/db";
import { PLANES } from "@/lib/creditos";
import { Card } from "@/components/ui/Card";

export default async function AdminFacturacionPage() {
  const clientes = await prisma.empresa.findMany({
    where: { rol: "CLIENTE" },
    select: { plan: true, nombre: true, creditosUsados: true, creditosIncluidos: true },
  });

  let mrr = 0;
  for (const c of clientes) {
    mrr += PLANES[c.plan].precioMensual;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Facturación</h1>
      <p className="mb-6 text-sm text-[#7C6FAE]">
        Estimación según planes del catálogo (USD/mes por cliente). Integración con pasarela de pago: fase
        posterior.
      </p>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-[#C4B5FD]">Clientes activos</p>
          <p className="mt-2 text-3xl font-bold text-white">{clientes.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">MRR estimado (USD)</p>
          <p className="mt-2 text-3xl font-bold text-white">{mrr.toLocaleString("es-AR")}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">Planes</p>
          <p className="mt-2 text-sm text-[#C4B5FD]">
            Basic {PLANES.BASIC.precioMensual} · Pro {PLANES.PRO.precioMensual} · Ent.{" "}
            {PLANES.ENTERPRISE.precioMensual}
          </p>
        </Card>
      </div>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Créditos por cliente</h2>
        <ul className="space-y-2 text-sm text-[#C4B5FD]">
          {clientes.map((c) => (
            <li key={c.nombre} className="flex justify-between border-b border-[#7B2FF7]/10 py-2">
              <span className="text-white">{c.nombre}</span>
              <span>
                {c.plan} · usados {c.creditosUsados.toFixed(1)} / {c.creditosIncluidos}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
