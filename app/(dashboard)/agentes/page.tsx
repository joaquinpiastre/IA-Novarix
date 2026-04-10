import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
          <Link key={a.id} href={`/agentes/${a.id}`}>
            <Card className="h-full transition hover:border-[#7B2FF7]/60">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">{a.nombre}</h2>
                <Badge variant={a.activo ? "activo" : "inactivo"}>
                  {a.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              {a.descripcion ? (
                <p className="mt-2 line-clamp-2 text-sm text-[#C4B5FD]">{a.descripcion}</p>
              ) : null}
              <p className="mt-4 text-xs text-[#7C6FAE]">
                {a._count.conversaciones} conversaciones {a.esDefault ? " · Agente por defecto" : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
      {!agentes.length ? (
        <p className="text-center text-[#7C6FAE]">Creá tu primer agente para empezar.</p>
      ) : null}
    </PageShell>
  );
}
