import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { extraerContenidoWebParaCatalogo, armarTextoBrutoDesdeWeb } from "@/lib/web-catalogo";
import { normalizarTextoCatalogoConIA } from "@/lib/catalogo-normalizar-ia";
import { esUrlSeguraParaFetch } from "@/lib/url-segura";

export async function POST(req: Request) {
  try {
    const ctx = await requireEmpresaContext();
    if ("error" in ctx) return ctx.error;

    let body: { url?: string; agenteId?: string | null; normalizarConIA?: boolean };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
    }

    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json({ error: "url requerida" }, { status: 400 });
    }
    if (!esUrlSeguraParaFetch(url)) {
      return NextResponse.json(
        { error: "URL no válida o no permitida (solo http/https a sitios públicos)" },
        { status: 400 }
      );
    }

    const agenteId =
      body.agenteId && body.agenteId !== ""
        ? (
            await prisma.agente.findFirst({
              where: { id: body.agenteId, empresaId: ctx.empresaId },
            })
          )?.id ?? null
        : null;

    let extraccion;
    try {
      extraccion = await extraerContenidoWebParaCatalogo(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al leer la página";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    let texto = armarTextoBrutoDesdeWeb(extraccion);
    if (body.normalizarConIA && process.env.OPENAI_API_KEY?.trim()) {
      try {
        texto = await normalizarTextoCatalogoConIA({
          textoBruto: texto,
          origenEtiqueta: `página web ${extraccion.urlFinal}`,
        });
      } catch (e) {
        console.warn("[catalogo/desde-web] normalizar IA:", e);
      }
    }

    const nombre = `Web: ${extraccion.tituloPagina}`.slice(0, 200);

    try {
      const archivo = await prisma.archivoConocimiento.create({
        data: {
          empresaId: ctx.empresaId,
          agenteId,
          nombre,
          tipo: "WEB",
          url: extraccion.urlFinal,
          contenido: texto.slice(0, 500_000),
        },
      });

      return NextResponse.json({
        archivo,
        urlLeida: extraccion.urlFinal,
        imagenesDetectadas: extraccion.urlsImagenes.length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al guardar en base de datos";
      console.error("[catalogo/desde-web] prisma create:", e);
      const hint = /TipoArchivo|enum|invalid input value/i.test(msg)
        ? " Ejecutá en el servidor: npx prisma migrate deploy (suele faltar el valor WEB en el enum o hay desalineación con la base)."
        : "";
      return NextResponse.json({ error: `${msg}${hint}` }, { status: 500 });
    }
  } catch (e) {
    console.error("[catalogo/desde-web] inesperado:", e);
    const msg = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
