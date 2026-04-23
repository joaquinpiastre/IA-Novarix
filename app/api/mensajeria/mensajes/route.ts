import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureUsuarioInterno } from "@/lib/mensajeria-usuario";
import { puedeVerCanal } from "@/lib/mensajeria-acceso";

const includeMsg = {
  usuario: { select: { id: true, nombre: true, email: true } },
  replyA: {
    select: {
      id: true,
      contenido: true,
      tipo: true,
      archivoNombre: true,
      eliminado: true,
      usuarioId: true,
      usuario: { select: { nombre: true } },
    },
  },
} satisfies Prisma.MensajeInternoInclude;

export async function GET(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const { searchParams } = new URL(req.url);
  const canalId = searchParams.get("canalId")?.trim();
  if (!canalId) return NextResponse.json({ error: "canalId requerido" }, { status: 400 });

  const canal = await prisma.canalInterno.findFirst({
    where: { id: canalId, empresaId: ctx.empresaId },
  });
  if (!canal || !puedeVerCanal(canal, ctx.empresaId, yo.id)) {
    return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
  }

  const take = Math.min(Number(searchParams.get("take") ?? "60") || 60, 120);
  const beforeId = searchParams.get("before")?.trim();
  const q = searchParams.get("q")?.trim();

  let beforeDate: Date | undefined;
  if (beforeId) {
    const row = await prisma.mensajeInterno.findFirst({
      where: { id: beforeId, empresaId: ctx.empresaId, canalId },
      select: { creadoEn: true },
    });
    if (row) beforeDate = row.creadoEn;
  }

  const where: Prisma.MensajeInternoWhereInput = {
    empresaId: ctx.empresaId,
    canalId,
    ...(beforeDate ? { creadoEn: { lt: beforeDate } } : {}),
    ...(q
      ? {
          OR: [
            { contenido: { contains: q, mode: "insensitive" } },
            { archivoNombre: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const raw = await prisma.mensajeInterno.findMany({
    where,
    orderBy: { creadoEn: "desc" },
    take,
    include: includeMsg,
  });
  const list = raw.reverse().map((m) => ({
    ...m,
    contenido: m.eliminado ? null : m.contenido,
    replyA: m.replyA
      ? {
          ...m.replyA,
          contenido: m.replyA.eliminado ? null : m.replyA.contenido,
        }
      : null,
  }));

  return NextResponse.json({ mensajes: list, yoId: yo.id });
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const body = (await req.json().catch(() => null)) as {
    canalId?: string;
    contenido?: string | null;
    tipo?: string;
    archivoUrl?: string | null;
    archivoNombre?: string | null;
    archivoTamano?: number | null;
    replyAId?: string | null;
  } | null;
  const canalId = body?.canalId?.trim();
  if (!canalId) return NextResponse.json({ error: "canalId requerido" }, { status: 400 });

  const canal = await prisma.canalInterno.findFirst({
    where: { id: canalId, empresaId: ctx.empresaId },
  });
  if (!canal || !puedeVerCanal(canal, ctx.empresaId, yo.id)) {
    return NextResponse.json({ error: "Canal no encontrado" }, { status: 404 });
  }

  const tipo = body?.tipo?.trim() || "texto";
  const contenido = body?.contenido?.trim() ?? null;
  const archivoUrl = body?.archivoUrl?.trim() ?? null;
  const archivoNombre = body?.archivoNombre?.trim() ?? null;
  const archivoTamano = typeof body?.archivoTamano === "number" ? body.archivoTamano : null;
  const replyAId = body?.replyAId?.trim() || null;

  if (tipo === "texto" && !contenido) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }
  if (tipo !== "texto" && !archivoUrl) {
    return NextResponse.json({ error: "Falta archivoUrl" }, { status: 400 });
  }

  if (replyAId) {
    const parent = await prisma.mensajeInterno.findFirst({
      where: { id: replyAId, empresaId: ctx.empresaId, canalId },
    });
    if (!parent) return NextResponse.json({ error: "Mensaje a responder no válido" }, { status: 400 });
  }

  const created = await prisma.mensajeInterno.create({
    data: {
      canalId,
      empresaId: ctx.empresaId,
      usuarioId: yo.id,
      contenido,
      tipo,
      archivoUrl,
      archivoNombre,
      archivoTamano: archivoTamano ?? undefined,
      replyAId: replyAId ?? undefined,
      leidoPor: [],
      leido: false,
    },
    include: includeMsg,
  });

  await prisma.mensajeriaTyping.deleteMany({
    where: { canalId, usuarioId: yo.id },
  });

  return NextResponse.json({ mensaje: created });
}
