import { NextResponse } from "next/server";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureUsuarioInterno, touchUsuarioActividad } from "@/lib/mensajeria-usuario";

export async function POST() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const u = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  await touchUsuarioActividad(u.id);
  return NextResponse.json({ ok: true });
}
