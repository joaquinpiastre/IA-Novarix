import { describe, expect, it } from "vitest";
import {
  mensajeErrorImportacionWeb,
  mensajeExitoImportacionWeb,
  parseCatalogoDesdeWebJson,
} from "@/lib/catalogo-desde-web-client";

describe("parseCatalogoDesdeWebJson", () => {
  it("vacío y JSON inválido", () => {
    expect(parseCatalogoDesdeWebJson("")).toEqual({});
    expect(parseCatalogoDesdeWebJson("   ")).toEqual({});
    expect(parseCatalogoDesdeWebJson("not json")).toEqual({});
    expect(parseCatalogoDesdeWebJson("[]")).toEqual({});
  });

  it("error de API", () => {
    expect(parseCatalogoDesdeWebJson(JSON.stringify({ error: "falló" }))).toEqual({ error: "falló" });
  });

  it("éxito con archivo e imágenes", () => {
    const raw = JSON.stringify({
      archivo: { nombre: "Web: Tienda" },
      imagenesDetectadas: 21,
    });
    const data = parseCatalogoDesdeWebJson(raw);
    expect(data.archivo?.nombre).toBe("Web: Tienda");
    expect(data.imagenesDetectadas).toBe(21);
    expect(mensajeExitoImportacionWeb(data)).toBe("Importado: Web: Tienda · 21 imágenes detectadas.");
  });

  it("éxito sin nombre de archivo", () => {
    const data = parseCatalogoDesdeWebJson(JSON.stringify({ archivo: {} }));
    expect(mensajeExitoImportacionWeb(data)).toBe("Importado: OK.");
  });
});

describe("mensajeErrorImportacionWeb", () => {
  it("prioriza error del JSON", () => {
    const data = parseCatalogoDesdeWebJson(JSON.stringify({ error: "URL no válida" }));
    expect(mensajeErrorImportacionWeb(400, "{}", data)).toBe("URL no válida");
  });
});
