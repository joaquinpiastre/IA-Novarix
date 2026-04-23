import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureUsuarioInterno } from "@/lib/mensajeria-usuario";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const list = await prisma.usuario.findMany({
    where: { empresaId: ctx.empresaId, activo: true, id: { not: yo.id } },
    select: { id: true, nombre: true, email: true, ultimaActividad: true },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json({ yo: { id: yo.id, nombre: yo.nombre, email: yo.email }, usuarios: list });
}
