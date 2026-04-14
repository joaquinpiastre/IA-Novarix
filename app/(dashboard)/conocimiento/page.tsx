import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { ConocimientoCliente } from "@/components/conocimiento/ConocimientoCliente";

export default async function ConocimientoPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  const [archivos, agentes] = await Promise.all([
    prisma.archivoConocimiento.findMany({
      where: { empresaId },
      include: { agente: { select: { nombre: true, id: true } } },
      orderBy: { creadoEn: "desc" },
    }),
    prisma.agente.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <PageShell title="Base de conocimiento">
      <ConocimientoCliente archivos={archivos} agentes={agentes} />
    </PageShell>
  );
}
