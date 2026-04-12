import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireEmpresaContext } from "@/lib/api-auth";
import { META_OAUTH_PAGES_COOKIE, parsearCookiePaginasPendientes } from "@/lib/meta-oauth-pending";

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const raw = cookies().get(META_OAUTH_PAGES_COOKIE)?.value;
  const payload = parsearCookiePaginasPendientes(raw);
  if (!payload) {
    return NextResponse.json({ error: "Sin selección pendiente" }, { status: 404 });
  }
  if (payload.empresaId !== ctx.empresaId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const pages = payload.pages.map((p) => ({
    id: p.id,
    name: p.name,
    pictureUrl: p.picture?.data?.url ?? null,
    instagramUsername: p.instagram_business_account?.username ?? null,
  }));

  return NextResponse.json({ pages });
}
