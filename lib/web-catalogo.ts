import * as cheerio from "cheerio";
import { esUrlSeguraParaFetch } from "@/lib/url-segura";

const FETCH_MS = 15_000;
const MAX_HTML_BYTES = 900_000;
/** Límite práctico: el mensaje de éxito y el bloque enviado a la IA no pueden listar miles de URLs. */
const MAX_URLS_IMAGEN = 200;

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

/** Primera URL de un atributo srcset ("url 1x, url2 2x" o "url 480w"). */
function primeraUrlDeSrcset(srcset: string | undefined, base: string): string | null {
  if (!srcset?.trim()) return null;
  const part = srcset.split(",")[0]?.trim();
  if (!part) return null;
  const url = part.split(/\s+/)[0]?.trim();
  return absolutizar(base, url);
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
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    urlFinal = r.url || trimmed;
    if (!esUrlSeguraParaFetch(urlFinal)) {
      throw new Error("La redirección llevó a una URL no permitida");
    }
    if (!r.ok) {
      const hint =
        r.status === 403 || r.status === 401
          ? " (a veces los sitios bloquean peticiones automáticas; probá de nuevo o usá Excel / API de stock)"
          : "";
      throw new Error(`El sitio respondió HTTP ${r.status}${r.statusText ? ` ${r.statusText}` : ""}.${hint}`);
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
    $("img").each((_, el) => {
      const $el = $(el);
      pushImg(absolutizar(urlFinal, $el.attr("src")));
      pushImg(absolutizar(urlFinal, $el.attr("data-src")));
      pushImg(absolutizar(urlFinal, $el.attr("data-lazy-src")));
      pushImg(absolutizar(urlFinal, $el.attr("data-original")));
      pushImg(primeraUrlDeSrcset($el.attr("srcset"), urlFinal));
      pushImg(primeraUrlDeSrcset($el.attr("data-srcset"), urlFinal));
    });
    $("source[srcset]").each((_, el) => {
      pushImg(primeraUrlDeSrcset($(el).attr("srcset"), urlFinal));
    });

    const textoPlano = $("body").text().replace(/\s+/g, " ").trim().slice(0, 120_000);

    return {
      urlFinal,
      tituloPagina,
      textoPlano: textoPlano || "(poco texto visible; puede ser una SPA o requerir login)",
      urlsImagenes: urlsImagenes.slice(0, MAX_URLS_IMAGEN),
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
