import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { requireEmpresaContext } from "@/lib/api-auth";

function esUrlBlobVercel(u: string) {
  try {
    const h = new URL(u).hostname;
    return h.endsWith("blob.vercel-storage.com") || h.endsWith("public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function perteneceAEmpresa(url: string, empresaId: string) {
  try {
    const p = new URL(url).pathname;
    return p.includes(`/mensajeria/${empresaId}/`);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const u = new URL(req.url).searchParams.get("u")?.trim();
  if (!u) return NextResponse.json({ error: "Parámetro u requerido" }, { status: 400 });
  if (!esUrlBlobVercel(u) || !perteneceAEmpresa(u, ctx.empresaId)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob no configurado" }, { status: 503 });
  }

  const result = await get(u, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
