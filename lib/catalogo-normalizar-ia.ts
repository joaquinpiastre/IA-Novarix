import { getOpenAI } from "@/lib/openai";

const MAX_ENTRADA = 12_000;
const MAX_SALIDA = 80_000;

/**
 * Toma texto crudo (Excel, HTML→texto, etc.) y devuelve un listado homogéneo
 * para la base de conocimiento del agente (precios, SKU, descripciones, imágenes si aparecen).
 */
export async function normalizarTextoCatalogoConIA(params: {
  textoBruto: string;
  origenEtiqueta: string;
}): Promise<string> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const entrada = params.textoBruto.slice(0, MAX_ENTRADA);
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `Sos un asistente que prepara catálogo para un agente de ventas en español argentino.
Origen de los datos: ${params.origenEtiqueta}.

A partir del contenido bruto, extraé ítems de producto o servicio cuando corresponda.
Para cada ítem, una sola línea con este formato (usá guión al inicio):
- Cód: (sku o vacío) · Nombre · Precio: (con moneda si existe) · Stock: (si hay) · Desc: (breve) · Img: (URL si hay, si no "—")

Reglas:
- No inventes precios ni datos que no estén o no se deduzcan claramente del texto.
- Si no es un catálogo de productos, listá ofertas/servicios/paquetes que sí figuren, o resumí en bullets lo útil para ventas.
- Sin markdown ni bloques de código; solo líneas que empiecen con "- ".
- Encabezado obligatorio en la primera línea: CATÁLOGO (IMPORTADO / NORMALIZADO POR IA):`,
      },
      {
        role: "user",
        content: `Contenido bruto:\n\n${entrada}`,
      },
    ],
  });

  const out = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!out) throw new Error("La IA no devolvió texto");
  return out.length > MAX_SALIDA ? `${out.slice(0, MAX_SALIDA)}\n…(truncado)` : out;
}
