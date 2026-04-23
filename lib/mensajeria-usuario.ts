import { prisma } from "@/lib/db";
import type { Session } from "next-auth";

export async function ensureUsuarioInterno(empresaId: string, session: Session) {
  const email = (session.user?.email ?? "").toLowerCase().trim();
  if (!email) {
    throw new Error("La sesión no tiene email; no se puede usar la mensajería.");
  }
  const nombre = session.user?.name?.trim() || email.split("@")[0] || "Usuario";
  return prisma.usuario.upsert({
    where: { empresaId_email: { empresaId, email } },
    create: { empresaId, nombre, email, ultimaActividad: new Date() },
    update: { nombre, ultimaActividad: new Date() },
  });
}

export async function touchUsuarioActividad(usuarioId: string) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { ultimaActividad: new Date() },
  });
}
