import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 4,
};

function jwtSecret(): string {
  const fromOpts = typeof authOptions.secret === "string" ? authOptions.secret : undefined;
  return (
    fromOpts ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === "development" ? "novarix-dev-inseguro-solo-local-cambiame" : "")
  );
}

/**
 * getToken(req) lee la cookie de sesión de forma fiable en Route Handlers;
 * getServerSession a veces devolvía null aquí y fallaba el impersonate.
 */
export async function POST(req: NextRequest) {
  const secret = jwtSecret();
  if (!secret) {
    return NextResponse.json({ error: "Falta NEXTAUTH_SECRET en el servidor" }, { status: 500 });
  }

  const token = await getToken({ req, secret });
  if (!token?.sub) {
    return NextResponse.json(
      { error: "Sesión no válida. Cerrá sesión y volvé a entrar como superadmin." },
      { status: 401 }
    );
  }
  if (token.rol !== "SUPERADMIN") {
    return NextResponse.json({ error: "Solo el superadmin puede ver como empresa." }, { status: 403 });
  }

  const { empresaId } = (await req.json()) as { empresaId?: string | null };

  if (!empresaId) {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("novarix_impersonate");
    return res;
  }

  // Solo rol CLIENTE; permitimos activo false para que puedas entrar a cuentas suspendidas
  const emp = await prisma.empresa.findFirst({
    where: { id: empresaId, rol: "CLIENTE" },
  });
  if (!emp) {
    return NextResponse.json(
      { error: "Empresa no encontrada o no es una cuenta cliente." },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("novarix_impersonate", empresaId, cookieOpts);
  return res;
}
