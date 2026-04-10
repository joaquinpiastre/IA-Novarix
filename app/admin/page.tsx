import { prisma } from "@/lib/db";
import { PLANES } from "@/lib/creditos";
import { Card } from "@/components/ui/Card";

const COSTO_POR_TOKEN = 0.00000037;

export default async function AdminHomePage() {
  const clientes = await prisma.empresa.findMany({
    where: { rol: "CLIENTE" },
    select: { plan: true },
  });

  let revenueMensual = 0;
  for (const c of clientes) {
    revenueMensual += PLANES[c.plan].precioMensual;
  }

  const tokensAgg = await prisma.conversacion.aggregate({ _sum: { tokensUsados: true } });
  const tokensTotal = tokensAgg._sum.tokensUsados ?? 0;
  const costoOpenAI = tokensTotal * COSTO_POR_TOKEN;
  const totalConversaciones = await prisma.conversacion.count();
  const margenNeto = revenueMensual - costoOpenAI;

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C026D3]">Super Admin</p>
        <h1 className="text-2xl font-bold text-white">Panel de gestión</h1>
        <p className="mt-1 text-sm text-[#7C6FAE]">Resumen de la plataforma Novarix AI</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-[#C4B5FD]">Conversaciones totales</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalConversaciones}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">Revenue mensual estimado</p>
          <p className="mt-2 text-3xl font-bold text-white">USD {revenueMensual.toLocaleString("es-AR")}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">Costo OpenAI (estim.)</p>
          <p className="mt-2 text-3xl font-bold text-white">USD {costoOpenAI.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-[#C4B5FD]">Margen neto (estim.)</p>
          <p className="mt-2 text-3xl font-bold text-white">USD {margenNeto.toFixed(2)}</p>
        </Card>
      </div>
      <p className="mt-8 text-sm text-[#7C6FAE]">
        Gestioná empresas desde el menú. Los montos usan los precios de plan del prompt maestro y un costo
        promedio por token de gpt-4o-mini.
      </p>
    </div>
  );
}
