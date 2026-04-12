import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { EtapasConfigClient } from "@/components/crm/EtapasConfigClient";
import { Button } from "@/components/ui/Button";
import { asegurarEtapasPorDefecto } from "@/lib/crm";

export default async function CrmConfigPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  await asegurarEtapasPorDefecto(empresaId);

  const etapas = await prisma.etapaCRM.findMany({
    where: { empresaId },
    orderBy: { orden: "asc" },
  });

  return (
    <PageShell title="Etapas del CRM">
      <div className="mb-6">
        <Link href="/crm">
          <Button type="button" variant="secondary">
            Volver al tablero
          </Button>
        </Link>
      </div>
      <EtapasConfigClient etapas={etapas} />
    </PageShell>
  );
}
