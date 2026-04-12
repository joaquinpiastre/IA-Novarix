import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { FormReglaSeguimiento } from "@/components/seguimientos/FormReglaSeguimiento";
import { asegurarEtapasPorDefecto } from "@/lib/crm";

export default async function NuevaReglaPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  await asegurarEtapasPorDefecto(empresaId);
  const etapas = await prisma.etapaCRM.findMany({
    where: { empresaId },
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <PageShell title="Nueva regla de seguimiento">
      <FormReglaSeguimiento etapas={etapas} />
    </PageShell>
  );
}
