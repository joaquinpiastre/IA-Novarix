import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { AgenteGuardadoBanner } from "@/components/agentes/AgenteGuardadoBanner";
import { AgenteListaCard } from "@/components/agentes/AgenteListaCard";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export default async function AgentesPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  const agentes = await prisma.agente.findMany({
    where: { empresaId },
    include: { _count: { select: { conversaciones: true } } },
    orderBy: { creadoEn: "desc" },
  });

  return (
    <PageShell title="Agentes">
      <AgenteGuardadoBanner />
      <div className="mb-6 flex justify-end">
        <Link href="/agentes/nuevo">
          <Button type="button" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo agente
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {agentes.map((a) => (
          <AgenteListaCard
            key={a.id}
            id={a.id}
            nombre={a.nombre}
            descripcion={a.descripcion}
            activo={a.activo}
            esDefault={a.esDefault}
            conversaciones={a._count.conversaciones}
          />
        ))}
      </div>
      {!agentes.length ? (
        <p className="text-center text-[#7C6FAE]">Creá tu primer agente para empezar.</p>
      ) : null}
    </PageShell>
  );
}
