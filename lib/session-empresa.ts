import { cookies } from "next/headers";
import type { Session } from "next-auth";

/** Para SUPERADMIN: si hay cookie de impersonación, usamos esa empresa en el dashboard. */
export async function getEffectiveEmpresaId(session: Session | null): Promise<string | null> {
  if (!session?.user?.id) return null;
  const rol = session.user.rol;
  const ownId = session.user.empresaId;
  if (rol === "SUPERADMIN") {
    const jar = await cookies();
    const imp = jar.get("novarix_impersonate")?.value;
    if (imp) return imp;
  }
  return ownId ?? null;
}
