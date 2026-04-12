import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { ContactoDetalleClient } from "@/components/crm/ContactoDetalleClient";

export default async function ContactoCrmPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  const [contacto, etapas] = await Promise.all([
    prisma.contacto.findFirst({
      where: { id: params.id, empresaId },
      include: {
        conversaciones: { orderBy: { ultimoMensaje: "desc" }, take: 20 },
        historialEtapas: { orderBy: { cambiadoEn: "desc" }, take: 50 },
        seguimientos: {
          orderBy: { creadoEn: "desc" },
          take: 30,
          include: { regla: { select: { nombre: true } } },
        },
      },
    }),
    prisma.etapaCRM.findMany({
      where: { empresaId },
      orderBy: { orden: "asc" },
    }),
  ]);

  if (!contacto) notFound();

  const etapaNombres = Object.fromEntries(etapas.map((e) => [e.id, e.nombre]));

  return (
    <PageShell title={contacto.nombre?.trim() || contacto.numero}>
      <p className="mb-6 text-sm text-[#C4B5FD]">
        {contacto.numero}
        {contacto.empresaCliente ? ` · ${contacto.empresaCliente}` : ""}
      </p>
      <ContactoDetalleClient
        contactoId={contacto.id}
        inicial={{
          nombre: contacto.nombre,
          numero: contacto.numero,
          empresaCliente: contacto.empresaCliente,
          etapaId: contacto.etapaId,
          valorOportunidad: contacto.valorOportunidad,
          notas: contacto.notas,
          proximoSeguimiento: contacto.proximoSeguimiento?.toISOString() ?? null,
        }}
        etapas={etapas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        conversaciones={contacto.conversaciones}
        historialEtapas={contacto.historialEtapas}
        seguimientos={contacto.seguimientos}
        etapaNombres={etapaNombres}
      />
    </PageShell>
  );
}
