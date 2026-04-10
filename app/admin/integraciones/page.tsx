import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminIntegracionesPage() {
  const empresas = await prisma.empresa.findMany({
    where: { rol: "CLIENTE" },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      stockApiUrl: true,
      whatsappPhoneId: true,
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Integraciones</h1>
      <p className="mb-6 text-sm text-[#7C6FAE]">
        Estado de API de stock/ERP y WhatsApp por empresa. La configuración detallada la hace cada tenant en
        Configuración.
      </p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-[#7B2FF7]/20 text-[#C4B5FD]">
            <tr>
              <th className="p-4">Empresa</th>
              <th className="p-4">API stock</th>
              <th className="p-4">WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-b border-[#7B2FF7]/10 text-[#C4B5FD]">
                <td className="p-4">
                  <p className="font-medium text-white">{e.nombre}</p>
                  <p className="text-xs text-[#7C6FAE]">{e.email}</p>
                </td>
                <td className="p-4">
                  {e.stockApiUrl ? (
                    <Badge variant="activo">Configurada</Badge>
                  ) : (
                    <Badge variant="inactivo">Sin URL</Badge>
                  )}
                </td>
                <td className="p-4">
                  {e.whatsappPhoneId ? (
                    <Badge variant="activo">Phone ID OK</Badge>
                  ) : (
                    <Badge variant="inactivo">Pendiente</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
