import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureUsuarioInterno } from "@/lib/mensajeria-usuario";
import { parseRemitenteMarker, withRemitenteMarker } from "@/lib/mensajeria-remitente";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const id = params.id?.trim();
  if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { contenido?: string } | null;
  const contenido = body?.contenido?.trim();
  if (!contenido) return NextResponse.json({ error: "contenido requerido" }, { status: 400 });

  const msg = await prisma.mensajeInterno.findFirst({
    where: { id, empresaId: ctx.empresaId, usuarioId: yo.id, eliminado: false },
  });
  if (!msg) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const updated = await prisma.mensajeInterno.update({
    where: { id },
    data: {
      contenido: withRemitenteMarker(
        contenido,
        parseRemitenteMarker(msg.contenido).remitenteNombre || yo.nombre
      ),
      editadoEn: new Date(),
      tipo: "texto",
    },
  });
  return NextResponse.json({ mensaje: updated });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const id = params.id?.trim();
  if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const msg = await prisma.mensajeInterno.findFirst({
    where: { id, empresaId: ctx.empresaId, usuarioId: yo.id, eliminado: false },
  });
  if (!msg) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.mensajeInterno.update({
    where: { id },
    data: { eliminado: true, contenido: null, archivoUrl: null, archivoNombre: null },
  });
  return NextResponse.json({ ok: true });
}
