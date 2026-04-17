import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/admin")) {
      if (token?.rol !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    if (
      path === "/" ||
      path.startsWith("/agentes") ||
      path.startsWith("/conversaciones") ||
      path.startsWith("/conocimiento") ||
      path.startsWith("/creditos") ||
      path.startsWith("/configuracion") ||
      path.startsWith("/crm") ||
      path.startsWith("/seguimientos") ||
      path.startsWith("/estadisticas")
    ) {
      if (token?.rol === "SUPERADMIN" && !req.cookies.get("novarix_impersonate")?.value) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/login") || path.startsWith("/register")) return true;
        if (path.startsWith("/api/webhook/whatsapp") || path.startsWith("/api/webhook/meta")) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/api/webhook/whatsapp",
    "/api/webhook/meta",
    "/",
    "/agentes/:path*",
    "/conversaciones/:path*",
    "/conocimiento/:path*",
    "/creditos/:path*",
    "/configuracion/:path*",
    "/crm",
    "/crm/:path*",
    "/seguimientos",
    "/seguimientos/:path*",
    "/estadisticas",
    "/estadisticas/:path*",
    "/admin/:path*",
  ],
};
