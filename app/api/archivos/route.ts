import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { TipoArchivo } from "@prisma/client";
import { excelBufferToTextoCatalogo } from "@/lib/excel-catalogo";
import { normalizarTextoCatalogoConIA } from "@/lib/catalogo-normalizar-ia";

function detectarTipo(nombre: string): TipoArchivo {
  const n = nombre.toLowerCase();
  if (n.endsWith(".pdf")) return "PDF";
  if (n.endsWith(".csv")) return "CSV";
  if (n.endsWith(".xlsx") || n.endsWith(".xls")) return "EXCEL";
  return "TEXTO";
}

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const archivos = await prisma.archivoConocimiento.findMany({
    where: { empresaId: ctx.empresaId },
    include: { agente: { select: { nombre: true, id: true } } },
    orderBy: { creadoEn: "desc" },
  });
  return NextResponse.json(archivos);
}

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = (await req.json()) as {
      titulo?: string;
      texto?: string;
      agenteId?: string | null;
    };
    const titulo = body.titulo?.trim() || "Conocimiento escrito";
    const texto = body.texto?.trim();
    if (!texto) {
      return NextResponse.json({ error: "Escribí el texto que querés que el agente use" }, { status: 400 });
    }

    const agenteId =
      body.agenteId && body.agenteId !== ""
        ? (
            await prisma.agente.findFirst({
              where: { id: body.agenteId, empresaId: ctx.empresaId },
            })
          )?.id ?? null
        : null;

    const archivo = await prisma.archivoConocimiento.create({
      data: {
        empresaId: ctx.empresaId,
        agenteId,
        nombre: titulo,
        tipo: "TEXTO",
        url: `manual://${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        contenido: texto.slice(0, 500_000),
      },
    });
    return NextResponse.json(archivo);
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const agenteIdRaw = form.get("agenteId") as string | null;
  const normalizarConIA =
    form.get("normalizarConIA") === "1" ||
    form.get("normalizarConIA") === "true" ||
    form.get("normalizarConIA") === "on";
  if (!file?.size) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const nombre = file.name;
  const tipo = detectarTipo(nombre);
  const buf = Buffer.from(await file.arrayBuffer());
  let url = `local://${nombre}`;
  let contenido: string | null = null;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const path = `${ctx.empresaId}/${Date.now()}-${nombre}`;
    const { data, error } = await supabase.storage.from("conocimiento").upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: pub } = supabase.storage.from("conocimiento").getPublicUrl(data.path);
    url = pub.publicUrl;
  }

  if (tipo === "TEXTO" || tipo === "CSV") {
    try {
      contenido = buf.toString("utf-8").slice(0, 500_000);
    } catch {
      contenido = null;
    }
  }

  if (tipo === "EXCEL") {
    try {
      let texto = excelBufferToTextoCatalogo(buf);
      if (normalizarConIA && process.env.OPENAI_API_KEY?.trim()) {
        try {
          texto = await normalizarTextoCatalogoConIA({
            textoBruto: texto,
            origenEtiqueta: `archivo Excel «${nombre}»`,
          });
        } catch (e) {
          console.warn("[archivos] normalizar Excel con IA:", e);
        }
      }
      contenido = texto.slice(0, 500_000);
    } catch (e) {
      console.warn("[archivos] leer Excel:", e);
      return NextResponse.json(
        { error: "No se pudo leer el Excel. Probá guardarlo como .xlsx y volver a subirlo." },
        { status: 400 }
      );
    }
  }

  const agenteId =
    agenteIdRaw && agenteIdRaw !== ""
      ? (
          await prisma.agente.findFirst({
            where: { id: agenteIdRaw, empresaId: ctx.empresaId },
          })
        )?.id ?? null
      : null;

  const archivo = await prisma.archivoConocimiento.create({
    data: {
      empresaId: ctx.empresaId,
      agenteId,
      nombre,
      tipo,
      url,
      contenido,
    },
  });
  return NextResponse.json(archivo);
}

export async function PATCH(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const { id, agenteIds } = (await req.json()) as { id?: string; agenteIds?: string[] };
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const existing = await prisma.archivoConocimiento.findFirst({
    where: { id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!agenteIds?.length) {
    await prisma.archivoConocimiento.update({
      where: { id },
      data: { agenteId: null },
    });
    return NextResponse.json({ ok: true });
  }

  const valid = await prisma.agente.findMany({
    where: { empresaId: ctx.empresaId, id: { in: agenteIds } },
    select: { id: true },
  });
  if (!valid.length) {
    return NextResponse.json({ error: "Ningún agente válido" }, { status: 400 });
  }

  await prisma.archivoConocimiento.update({
    where: { id },
    data: { agenteId: valid[0].id },
  });

  for (let i = 1; i < valid.length; i++) {
    await prisma.archivoConocimiento.create({
      data: {
        empresaId: ctx.empresaId,
        agenteId: valid[i].id,
        nombre: `${existing.nombre} (copia)`,
        tipo: existing.tipo,
        url: existing.url,
        contenido: existing.contenido,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const existing = await prisma.archivoConocimiento.findFirst({
    where: { id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.archivoConocimiento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
