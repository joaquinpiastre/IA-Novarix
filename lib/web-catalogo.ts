import * as cheerio from "cheerio";
import { esUrlSeguraParaFetch } from "@/lib/url-segura";

const FETCH_MS = 15_000;
const MAX_HTML_BYTES = 900_000;

function absolutizar(base: string, href: string | undefined): string | null {
  if (!href?.trim()) return null;
  const h = href.trim();
  if (h.startsWith("data:") || h.startsWith("javascript:")) return null;
  try {
    return new URL(h, base).href;
  } catch {
    return null;
  }
}

export type ExtraccionWebCatalogo = {
  urlFinal: string;
  tituloPagina: string;
  textoPlano: string;
  urlsImagenes: string[];
  ogDescription: string;
};

export async function extraerContenidoWebParaCatalogo(url: string): Promise<ExtraccionWebCatalogo> {
  const trimmed = url.trim();
  if (!esUrlSeguraParaFetch(trimmed)) {
    throw new Error("URL no permitida (solo http/https públicas)");
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_MS);
  let urlFinal = trimmed;
  try {
    const r = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; NovarixBot/1.0; +https://novarix.digital) catalog-import",
      },
      cache: "no-store",
    });
    urlFinal = r.url || trimmed;
    if (!esUrlSeguraParaFetch(urlFinal)) {
      throw new Error("La redirección llevó a una URL no permitida");
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const slice = buf.subarray(0, MAX_HTML_BYTES);
    const html = slice.toString("utf-8");

    const $ = cheerio.load(html);
    const tituloPagina = $("title").first().text().replace(/\s+/g, " ").trim() || "(sin título)";

    const ogDescription =
      $('meta[property="og:description"]').attr("content")?.trim() ||
      $('meta[name="description"]').attr("content")?.trim() ||
      "";

    $("script, style, noscript, svg").remove();

    const urlsImagenes: string[] = [];
    const seen = new Set<string>();

    const pushImg = (u: string | null) => {
      if (!u || seen.has(u)) return;
      seen.add(u);
      urlsImagenes.push(u);
    };

    pushImg(absolutizar(urlFinal, $('meta[property="og:image"]').attr("content")));
    $("img[src]").each((_, el) => {
      pushImg(absolutizar(urlFinal, $(el).attr("src")));
    });

    const textoPlano = $("body").text().replace(/\s+/g, " ").trim().slice(0, 120_000);

    return {
      urlFinal,
      tituloPagina,
      textoPlano: textoPlano || "(poco texto visible; puede ser una SPA o requerir login)",
      urlsImagenes: urlsImagenes.slice(0, 80),
      ogDescription,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function armarTextoBrutoDesdeWeb(ext: ExtraccionWebCatalogo): string {
  const lines = [
    `CATÁLOGO / PÁGINA WEB IMPORTADA`,
    `URL: ${ext.urlFinal}`,
    `Título: ${ext.tituloPagina}`,
  ];
  if (ext.ogDescription) lines.push(`Descripción (meta): ${ext.ogDescription}`);
  if (ext.urlsImagenes.length) {
    lines.push("", "Imágenes detectadas (URLs):", ...ext.urlsImagenes.map((u) => `- ${u}`));
  }
  lines.push("", "Texto visible de la página:", ext.textoPlano);
  return lines.join("\n");
}
