import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { CrmWorkspace } from "@/components/crm/CrmWorkspace";
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
    origen: c.origen,
    proximoSeguimiento: c.proximoSeguimiento?.toISOString() ?? null,
    email: c.email,
    empresaCliente: c.empresaCliente,
  }));

  return (
    <PageShell title="CRM">
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-[#C4B5FD]">
        Base de clientes centralizada: filtrá por canal y fechas, mové oportunidades en el embudo, exportá todo a Excel
        para campañas o reporting, y mantené el detalle de cada cuenta con historial y seguimientos.
      </p>
      <CrmWorkspace
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
