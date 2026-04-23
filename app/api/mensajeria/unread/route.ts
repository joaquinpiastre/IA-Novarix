import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureCanalesPorDefecto } from "@/lib/mensajeria-canales-default";
import { ensureUsuarioInterno } from "@/lib/mensajeria-usuario";
import { puedeVerCanal } from "@/lib/mensajeria-acceso";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  await ensureCanalesPorDefecto(ctx.empresaId);

  const canales = await prisma.canalInterno.findMany({
    where: { empresaId: ctx.empresaId },
  });
  const visibles = canales.filter((c) => puedeVerCanal(c, ctx.empresaId, yo.id));

  let total = 0;
  for (const c of visibles) {
    total += await prisma.mensajeInterno.count({
      where: {
        canalId: c.id,
        empresaId: ctx.empresaId,
        eliminado: false,
        usuarioId: { not: yo.id },
        NOT: { leidoPor: { has: yo.id } },
      },
    });
  }

  return NextResponse.json({ total });
}
