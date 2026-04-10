import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminAgentesPage() {
  const agentes = await prisma.agente.findMany({
    include: { empresa: { select: { nombre: true, email: true } } },
    orderBy: { creadoEn: "desc" },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Bots / Agentes</h1>
      <p className="mb-6 text-sm text-[#7C6FAE]">
        Todos los agentes de todas las empresas. Editá prompt, modelo, ruteo y flags como en un panel SaaS
        completo.
      </p>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[#7B2FF7]/20 text-[#C4B5FD]">
            <tr>
              <th className="p-4">Bot</th>
              <th className="p-4">Empresa</th>
              <th className="p-4">Modelo</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Ruteo</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="text-[#C4B5FD]">
            {agentes.map((a) => (
              <tr key={a.id} className="border-b border-[#7B2FF7]/10">
                <td className="p-4">
                  <p className="font-medium text-white">{a.nombre}</p>
                  {a.slug ? <p className="text-xs text-[#7C6FAE]">{a.slug}</p> : null}
                </td>
                <td className="p-4">
                  <p>{a.empresa.nombre}</p>
                  <p className="text-xs text-[#7C6FAE]">{a.empresa.email}</p>
                </td>
                <td className="p-4 text-xs">{a.modeloOpenai}</td>
                <td className="p-4">
                  <Badge variant={a.activo ? "activo" : "inactivo"}>{a.activo ? "Activo" : "Off"}</Badge>
                  {a.esDefault ? (
                    <span className="ml-2 text-xs text-[#A855F7]">default</span>
                  ) : null}
                </td>
                <td className="p-4 text-xs">{a.codigoActivacion ?? "—"}</td>
                <td className="p-4">
                  <Link href={`/admin/agentes/${a.id}`} className="text-[#A855F7] hover:underline">
                    Configurar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!agentes.length ? <p className="p-6 text-[#7C6FAE]">No hay agentes. Creálos desde el panel de cada empresa.</p> : null}
      </Card>
    </div>
  );
}
