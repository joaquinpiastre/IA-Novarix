import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureUsuarioInterno } from "@/lib/mensajeria-usuario";
import { puedeVerCanal } from "@/lib/mensajeria-acceso";

const VENTANA_MS = 5000;

export async function GET(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const canalId = new URL(req.url).searchParams.get("canalId")?.trim();
  if (!canalId) return NextResponse.json({ error: "canalId requerido" }, { status: 400 });

  const canal = await prisma.canalInterno.findFirst({
    where: { id: canalId, empresaId: ctx.empresaId },
  });
  if (!canal || !puedeVerCanal(canal, ctx.empresaId, yo.id)) {
    return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
  }

  const desde = new Date(Date.now() - VENTANA_MS);
  const rows = await prisma.mensajeriaTyping.findMany({
    where: {
      canalId,
      empresaId: ctx.empresaId,
      actualizadoEn: { gte: desde },
      usuarioId: { not: yo.id },
    },
    include: { usuario: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json({
    escribiendo: rows.map((r) => ({ usuarioId: r.usuarioId, nombre: r.usuario.nombre })),
  });
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const body = (await req.json().catch(() => null)) as { canalId?: string; activo?: boolean } | null;
  const canalId = body?.canalId?.trim();
  const activo = Boolean(body?.activo);
  if (!canalId) return NextResponse.json({ error: "canalId requerido" }, { status: 400 });

  const canal = await prisma.canalInterno.findFirst({
    where: { id: canalId, empresaId: ctx.empresaId },
  });
  if (!canal || !puedeVerCanal(canal, ctx.empresaId, yo.id)) {
    return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
  }

  if (!activo) {
    await prisma.mensajeriaTyping.deleteMany({ where: { canalId, usuarioId: yo.id } });
    return NextResponse.json({ ok: true });
  }

  await prisma.mensajeriaTyping.upsert({
    where: { canalId_usuarioId: { canalId, usuarioId: yo.id } },
    create: { canalId, usuarioId: yo.id, empresaId: ctx.empresaId },
    update: { actualizadoEn: new Date() },
  });
  return NextResponse.json({ ok: true });
}
