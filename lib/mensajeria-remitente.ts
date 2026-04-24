const REMITENTE_PREFIX = "[[sender:";
const REMITENTE_SUFFIX = "]]";

export function withRemitenteMarker(contenido: string | null | undefined, remitenteNombre: string): string {
  const sender = remitenteNombre.trim();
  const body = (contenido ?? "").trim();
  return `${REMITENTE_PREFIX}${sender}${REMITENTE_SUFFIX}${body}`;
}

export function parseRemitenteMarker(raw: string | null | undefined): {
  remitenteNombre: string | null;
  contenidoLimpio: string | null;
} {
  const text = raw ?? "";
  if (!text.startsWith(REMITENTE_PREFIX)) {
    return { remitenteNombre: null, contenidoLimpio: raw ?? null };
  }
  const end = text.indexOf(REMITENTE_SUFFIX, REMITENTE_PREFIX.length);
  if (end < 0) {
    return { remitenteNombre: null, contenidoLimpio: raw ?? null };
  }
  const nombre = text.slice(REMITENTE_PREFIX.length, end).trim() || null;
  const contenido = text.slice(end + REMITENTE_SUFFIX.length);
  return { remitenteNombre: nombre, contenidoLimpio: contenido || null };
}
