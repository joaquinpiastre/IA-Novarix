import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import { SeguimientosClient } from "@/components/seguimientos/SeguimientosClient";

export default async function SeguimientosPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  const [reglas, ultimos] = await Promise.all([
    prisma.reglaFollowUp.findMany({
      where: { empresaId },
      orderBy: { creadoEn: "desc" },
    }),
    prisma.seguimientoEnviado.findMany({
      where: { contacto: { empresaId } },
      orderBy: { creadoEn: "desc" },
      take: 50,
      include: {
        contacto: { select: { nombre: true, numero: true } },
        regla: { select: { nombre: true } },
      },
    }),
  ]);

  return (
    <PageShell title="Seguimientos automáticos">
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[#C4B5FD]">
        Reglas simples: podés elegir entre mensajes para <strong className="text-white">toda la cartera</strong> o
        solo para <strong className="text-white">unos números</strong>. Por defecto no se envía a contactos en etapa
        Ganado o Perdido, para no insistir si ya cerraron o compraron. El cron revisa cada ~30 minutos.
      </p>
      <SeguimientosClient
        reglas={reglas}
        ultimos={ultimos.map((u) => ({
          ...u,
          enviadoEn: u.enviadoEn?.toISOString() ?? null,
          creadoEn: u.creadoEn.toISOString(),
        }))}
      />
    </PageShell>
  );
}
