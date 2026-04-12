import { NextResponse } from "next/server";
import { parseMetaOAuthState } from "@/lib/meta-oauth-state";
import {
  intercambiarCodePorToken,
  intercambiarPorTokenLargoPlazo,
  listarPaginasDelUsuario,
  type CuentaPaginaMeta,
} from "@/lib/meta-graph";
import {
  META_OAUTH_PAGES_COOKIE,
  META_OAUTH_PAGES_COOKIE_MAX_AGE,
  serializarCookiePaginasPendientes,
  type PaginaOAuthPendiente,
} from "@/lib/meta-oauth-pending";
import { guardarPaginaMetaYWebhooks } from "@/lib/meta-oauth-finalize";

function baseAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function toPaginaPendiente(p: CuentaPaginaMeta): PaginaOAuthPendiente {
  return {
    id: p.id,
    name: p.name,
    access_token: p.access_token,
    picture: p.picture,
    instagram_business_account: p.instagram_business_account,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error_description") || url.searchParams.get("error");
  const base = baseAppUrl();
  const volver = `${base}/configuracion`;

  if (err) {
    return NextResponse.redirect(`${volver}?meta_error=${encodeURIComponent(String(err))}`);
  }

  const parsed = parseMetaOAuthState(state);
  if (!code || !parsed) {
    return NextResponse.redirect(
      `${volver}?meta_error=${encodeURIComponent("Sesión de vinculación inválida o vencida. Probá de nuevo.")}`
    );
  }

  const shortTok = await intercambiarCodePorToken(code);
  if (!shortTok?.access_token) {
    return NextResponse.redirect(
      `${volver}?meta_error=${encodeURIComponent("No se pudo validar con Meta.")}`
    );
  }

  const longUser = await intercambiarPorTokenLargoPlazo(shortTok.access_token);
  const userToken = longUser || shortTok.access_token;
  const paginas = await listarPaginasDelUsuario(userToken);

  if (!paginas.length) {
    return NextResponse.redirect(
      `${volver}?meta_error=${encodeURIComponent(
        "No encontramos páginas de Facebook con acceso. Asegurate de ser administrador de una página."
      )}`
    );
  }

  if (paginas.length === 1) {
    await guardarPaginaMetaYWebhooks(parsed.empresaId, toPaginaPendiente(paginas[0]));
    return NextResponse.redirect(`${volver}?conectado=true`);
  }

  const pendientes = paginas.map(toPaginaPendiente);
  const cookieVal = serializarCookiePaginasPendientes(parsed.empresaId, pendientes);
  const res = NextResponse.redirect(`${volver}?seleccionar_pagina=1`);
  res.cookies.set(META_OAUTH_PAGES_COOKIE, cookieVal, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: META_OAUTH_PAGES_COOKIE_MAX_AGE,
  });
  return res;
}
