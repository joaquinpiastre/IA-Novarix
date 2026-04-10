import type { Empresa } from "@prisma/client";

const FETCH_MS = 12_000;
const MAX_CATALOGO_CHARS = 14_000;

type EmpresaStock = Pick<Empresa, "stockApiUrl" | "stockApiToken" | "stockApiKeyHeader">;

function headersAuth(e: EmpresaStock): Record<string, string> {
  const token = e.stockApiToken?.trim();
  if (!token) return {};
  const h = e.stockApiKeyHeader?.trim();
  if (h && h.toLowerCase() !== "authorization") {
    return { [h]: token };
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * Acepta JSON flexible: array de objetos, o { productos | items | data | result: array }.
 * Por ítem intenta leer: nombre/name/producto/descripcion, codigo/sku/id, precio/price, stock/cantidad/quantity.
 */
export function formatearJsonCatalogo(data: unknown): string {
  const rows: string[] = [];
  const pushRow = (o: Record<string, unknown>) => {
    const nombre =
      pickStr(o, ["nombre", "name", "producto", "descripcion", "title", "titulo"]) ?? "—";
    const codigo = pickStr(o, ["codigo", "sku", "id", "code", "articulo"]) ?? "";
    const precio = pickStr(o, ["precio", "price", "precio_venta", "importe"]) ?? "";
    const stock = pickStr(o, ["stock", "cantidad", "quantity", "existencia", "disponible"]) ?? "";
    const moneda = pickStr(o, ["moneda", "currency"]) ?? "";
    const line = [codigo && `Cód: ${codigo}`, nombre, precio && `Precio: ${precio}${moneda ? ` ${moneda}` : ""}`, stock && `Stock: ${stock}`]
      .filter(Boolean)
      .join(" · ");
    if (!line || (!codigo && (!nombre || nombre === "—") && !precio && !stock)) return;
    rows.push(`- ${line}`);
  };

  const visit = (v: unknown) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      for (const x of v) {
        if (x && typeof x === "object" && !Array.isArray(x)) pushRow(x as Record<string, unknown>);
        else if (Array.isArray(x)) visit(x);
      }
      return;
    }
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      const keys = ["productos", "items", "data", "result", "results", "articulos", "stock", "lista"];
      for (const k of keys) {
        if (k in o && o[k] != null) {
          visit(o[k]);
          return;
        }
      }
      pushRow(o);
    }
  };

  visit(data);
  if (!rows.length) {
    try {
      const s = JSON.stringify(data);
      return s.length > MAX_CATALOGO_CHARS ? s.slice(0, MAX_CATALOGO_CHARS) + "\n…(truncado)" : s;
    } catch {
      return "";
    }
  }
  const text = ["CATÁLOGO / STOCK (API del sistema de gestión):", ...rows].join("\n");
  return text.length > MAX_CATALOGO_CHARS ? text.slice(0, MAX_CATALOGO_CHARS) + "\n…(catálogo truncado)" : text;
}

function pickStr(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k] ?? o[k.charAt(0).toUpperCase() + k.slice(1)];
    if (v != null && v !== "") return String(v);
  }
  return null;
}

/** Texto listo para inyectar en el system prompt junto al resto del conocimiento. */
export async function obtenerTextoCatalogoExterno(empresa: EmpresaStock): Promise<string> {
  const url = empresa.stockApiUrl?.trim();
  if (!url) return "";

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_MS);
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...headersAuth(empresa),
      },
      signal: ac.signal,
      cache: "no-store",
    });
    if (!r.ok) {
      console.warn("stock API HTTP", r.status, url);
      return "";
    }
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      const t = await r.text();
      const plain = t.slice(0, MAX_CATALOGO_CHARS);
      return plain ? `DATOS DEL ERP (texto):\n${plain}` : "";
    }
    const data = await r.json();
    return formatearJsonCatalogo(data);
  } catch (e) {
    console.warn("stock API fetch error", e);
    return "";
  } finally {
    clearTimeout(timer);
  }
}
