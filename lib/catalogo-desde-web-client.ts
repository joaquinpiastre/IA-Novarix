/**
 * Cliente: parseo de la respuesta de POST /api/catalogo/desde-web.
 * Vive en lib/ para tipado estable en build (Vercel) y tests unitarios.
 */

export type CatalogoDesdeWebRespuesta = {
  error?: string;
  archivo?: { nombre?: string };
  imagenesDetectadas?: number;
};

export function parseCatalogoDesdeWebJson(raw: string): CatalogoDesdeWebRespuesta {
  const vacio: CatalogoDesdeWebRespuesta = {};
  if (!raw.trim()) return vacio;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return vacio;
    const o = parsed as Record<string, unknown>;
    const out: CatalogoDesdeWebRespuesta = {};
    if (typeof o.error === "string") out.error = o.error;
    if (o.archivo !== null && typeof o.archivo === "object" && !Array.isArray(o.archivo)) {
      const a = o.archivo as Record<string, unknown>;
      if (typeof a.nombre === "string") out.archivo = { nombre: a.nombre };
      else out.archivo = {};
    }
    if (typeof o.imagenesDetectadas === "number" && Number.isFinite(o.imagenesDetectadas)) {
      out.imagenesDetectadas = o.imagenesDetectadas;
    }
    return out;
  } catch {
    return vacio;
  }
}

export function mensajeErrorImportacionWeb(
  status: number,
  raw: string,
  data: CatalogoDesdeWebRespuesta
): string {
  const fallback =
    raw && !data.error ? raw.slice(0, 280).replace(/\s+/g, " ").trim() : "";
  return data.error ?? (fallback ? `Error ${status}: ${fallback}` : "No se pudo importar.");
}

export function mensajeExitoImportacionWeb(data: CatalogoDesdeWebRespuesta): string {
  const nombreOk = data.archivo?.nombre ?? "OK";
  const nImg = data.imagenesDetectadas;
  const parteImg = typeof nImg === "number" ? ` · ${nImg} imágenes detectadas` : "";
  return `Importado: ${nombreOk}${parteImg}.`;
}
