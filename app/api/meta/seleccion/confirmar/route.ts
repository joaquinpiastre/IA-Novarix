import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireEmpresaContext } from "@/lib/api-auth";
import {
  META_OAUTH_PAGES_COOKIE,
  parsearCookiePaginasPendientes,
} from "@/lib/meta-oauth-pending";
import { guardarPaginaMetaYWebhooks } from "@/lib/meta-oauth-finalize";

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json().catch(() => ({}))) as { pageId?: string };
  const pageId = body.pageId?.trim();
  if (!pageId) {
    return NextResponse.json({ error: "Falta pageId" }, { status: 400 });
  }

  const raw = cookies().get(META_OAUTH_PAGES_COOKIE)?.value;
  const payload = parsearCookiePaginasPendientes(raw);
  if (!payload) {
    return NextResponse.json({ error: "Sesión vencida. Volvé a conectar." }, { status: 404 });
  }
  if (payload.empresaId !== ctx.empresaId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const elegida = payload.pages.find((p) => p.id === pageId);
  if (!elegida) {
    return NextResponse.json({ error: "Página no encontrada" }, { status: 404 });
  }

  await guardarPaginaMetaYWebhooks(ctx.empresaId, elegida);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(META_OAUTH_PAGES_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
