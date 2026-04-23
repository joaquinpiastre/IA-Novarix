import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureUsuarioInterno } from "@/lib/mensajeria-usuario";

const MAX = 50 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  await ensureUsuarioInterno(ctx.empresaId, ctx.session);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Almacenamiento de archivos no configurado. Definí BLOB_READ_WRITE_TOKEN (Vercel Blob) en el entorno.",
      },
      { status: 503 }
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido (campo file)" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "El archivo supera los 50MB" }, { status: 400 });
  }
  const type = file.type || "application/octet-stream";
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ error: `Tipo no permitido: ${type}` }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
  const path = `mensajeria/${ctx.empresaId}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(path, buffer, {
    access: "public",
    contentType: type,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return NextResponse.json({
    url: blob.url,
    nombre: file.name,
    tamano: file.size,
    contentType: type,
  });
}
