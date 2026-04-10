import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import type { Rol } from "@prisma/client";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: Response.json({ error: "No autorizado" }, { status: 401 }) };
  }
  return { session };
}

export async function requireEmpresaContext() {
  const { session, error } = await requireSession();
  if (error) return { error };
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) {
    return { error: Response.json({ error: "Empresa no encontrada" }, { status: 403 }) };
  }
  return { session, empresaId };
}

export function requireRole(session: { user: { rol: Rol } }, roles: Rol[]) {
  if (!roles.includes(session.user.rol)) {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }
  return null;
}
