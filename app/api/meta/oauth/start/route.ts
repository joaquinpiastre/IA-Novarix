import { NextResponse } from "next/server";

/** Compatibilidad: el flujo oficial vive en `/api/meta/oauth/inicio`. */
export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/api/meta/oauth/inicio", req.url), 307);
}
