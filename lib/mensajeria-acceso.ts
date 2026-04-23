import type { CanalInterno } from "@prisma/client";

export function puedeVerCanal(
  canal: Pick<CanalInterno, "empresaId" | "miembros">,
  empresaId: string,
  usuarioId: string
) {
  if (canal.empresaId !== empresaId) return false;
  if (!canal.miembros?.length) return true;
  return canal.miembros.includes(usuarioId);
}
