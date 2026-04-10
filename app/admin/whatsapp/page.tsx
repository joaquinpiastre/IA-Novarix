import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminWhatsappPage() {
  const empresas = await prisma.empresa.findMany({
    where: { rol: "CLIENTE" },
    orderBy: { nombre: "asc" },
    select: {
      nombre: true,
      email: true,
      whatsappPhoneId: true,
      whatsappNumero: true,
      activo: true,
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">WhatsApp</h1>
      <p className="mb-6 text-sm text-[#7C6FAE]">
        Webhook único de la plataforma: <code className="text-[#A855F7]">/api/webhook/whatsapp</code>. Meta
        identifica al tenant por <strong className="text-white">Phone Number ID</strong>.
      </p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#7B2FF7]/20 text-[#C4B5FD]">
            <tr>
              <th className="p-4">Empresa</th>
              <th className="p-4">Phone Number ID</th>
              <th className="p-4">Número prueba</th>
              <th className="p-4">Cuenta</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.email} className="border-b border-[#7B2FF7]/10 text-[#C4B5FD]">
                <td className="p-4 font-medium text-white">{e.nombre}</td>
                <td className="p-4 font-mono text-xs">{e.whatsappPhoneId ?? "—"}</td>
                <td className="p-4 text-xs">{e.whatsappNumero ?? "—"}</td>
                <td className="p-4">
                  <Badge variant={e.activo ? "activo" : "inactivo"}>{e.activo ? "Activa" : "Off"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
