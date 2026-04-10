import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { AgenteForm } from "@/components/agentes/AgenteForm";
import { Card } from "@/components/ui/Card";

export default async function EditarAgentePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  const agente = await prisma.agente.findFirst({
    where: { id: params.id, empresaId },
    include: {
      archivos: { select: { id: true, nombre: true, tipo: true, creadoEn: true } },
    },
  });
  if (!agente) notFound();

  return (
    <PageShell title={`Configurar: ${agente.nombre}`}>
      <AgenteForm agenteId={agente.id} />
      <Card className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-white">Archivos de conocimiento vinculados</h3>
        {agente.archivos.length ? (
          <ul className="space-y-2 text-sm text-[#C4B5FD]">
            {agente.archivos.map((f) => (
              <li key={f.id}>
                {f.nombre} <span className="text-[#7C6FAE]">({f.tipo})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#7C6FAE]">
            No hay archivos vinculados. Asignalos desde Conocimiento.
          </p>
        )}
      </Card>
    </PageShell>
  );
}
