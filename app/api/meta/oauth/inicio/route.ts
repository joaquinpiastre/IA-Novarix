import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { crearMetaOAuthState } from "@/lib/meta-oauth-state";
import { getMetaAppId, getMetaOAuthRedirectUri } from "@/lib/meta-graph";

const SCOPES = [
  "pages_messaging",
  "instagram_basic",
  "instagram_manage_messages",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

export async function GET() {
  const baseLogin = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", baseLogin));
  }
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) {
    return NextResponse.json({ error: "Sin empresa" }, { status: 403 });
  }

  const appId = getMetaAppId();
  if (!appId) {
    return NextResponse.json(
      {
        error:
          "META_APP_ID no configurado en el servidor. Contactá al administrador de la plataforma.",
      },
      { status: 503 }
    );
  }

  const state = crearMetaOAuthState(empresaId);
  const redirectUri = getMetaOAuthRedirectUri();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES,
    response_type: "code",
  });

  const apiVer = process.env.WHATSAPP_API_VERSION ?? "v18.0";
  const url = `https://www.facebook.com/${apiVer}/dialog/oauth?${params}`;
  return NextResponse.redirect(url);
}
