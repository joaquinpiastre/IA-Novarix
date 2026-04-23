import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureUsuarioInterno } from "@/lib/mensajeria-usuario";
import { puedeVerCanal } from "@/lib/mensajeria-acceso";

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const body = (await req.json().catch(() => null)) as { canalId?: string } | null;
  const canalId = body?.canalId?.trim();
  if (!canalId) return NextResponse.json({ error: "canalId requerido" }, { status: 400 });

  const canal = await prisma.canalInterno.findFirst({
    where: { id: canalId, empresaId: ctx.empresaId },
  });
  if (!canal || !puedeVerCanal(canal, ctx.empresaId, yo.id)) {
    return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
  }

  const pendientes = await prisma.mensajeInterno.findMany({
    where: {
      canalId,
      empresaId: ctx.empresaId,
      eliminado: false,
      usuarioId: { not: yo.id },
      NOT: { leidoPor: { has: yo.id } },
    },
    select: { id: true, leidoPor: true },
  });

  for (const m of pendientes) {
    const leidoPor = m.leidoPor.includes(yo.id) ? m.leidoPor : [...m.leidoPor, yo.id];
    await prisma.mensajeInterno.update({
      where: { id: m.id },
      data: {
        leidoPor,
        leido: leidoPor.length > 1,
      },
    });
  }

  return NextResponse.json({ actualizados: pendientes.length });
}
