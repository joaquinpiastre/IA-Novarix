import { NextResponse } from "next/server";

/** Quita la cookie de ver-como-empresa al cerrar sesión (no requiere body). */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("novarix_impersonate");
  return res;
}
