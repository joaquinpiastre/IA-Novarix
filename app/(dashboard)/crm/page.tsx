import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { CrmBoard } from "@/components/crm/CrmBoard";
import { asegurarEtapasPorDefecto } from "@/lib/crm";

export default async function CrmPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  await asegurarEtapasPorDefecto(empresaId);

  const [etapas, contactosRaw] = await Promise.all([
    prisma.etapaCRM.findMany({
      where: { empresaId },
      orderBy: { orden: "asc" },
    }),
    prisma.contacto.findMany({
      where: { empresaId },
      orderBy: { ultimaInteraccion: "desc" },
    }),
  ]);

  const contactos = contactosRaw.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    numero: c.numero,
    valorOportunidad: c.valorOportunidad,
    ultimaInteraccion: c.ultimaInteraccion.toISOString(),
    etapaId: c.etapaId,
  }));

  return (
    <PageShell title="CRM">
      <CrmBoard
        etapas={etapas.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          color: e.color,
          orden: e.orden,
        }))}
        contactos={contactos}
      />
    </PageShell>
  );
}
