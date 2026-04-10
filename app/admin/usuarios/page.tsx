import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminUsuariosPage() {
  const cuentas = await prisma.empresa.findMany({
    where: { rol: "CLIENTE" },
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      plan: true,
      activo: true,
      creadoEn: true,
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Usuarios</h1>
      <p className="mb-6 text-sm text-[#7C6FAE]">Cuentas cliente (una por empresa). El alta sigue en Empresas.</p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#7B2FF7]/20 text-[#C4B5FD]">
            <tr>
              <th className="p-4">Empresa</th>
              <th className="p-4">Email</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Alta</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((u) => (
              <tr key={u.id} className="border-b border-[#7B2FF7]/10 text-[#C4B5FD]">
                <td className="p-4 font-medium text-white">{u.nombre}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">{u.plan}</td>
                <td className="p-4">
                  <Badge variant={u.activo ? "activo" : "inactivo"}>{u.activo ? "Activa" : "Suspendida"}</Badge>
                </td>
                <td className="p-4 text-xs text-[#7C6FAE]">{u.creadoEn.toLocaleDateString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
