import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { construirSystemPrompt, generarRespuestaAgente } from "@/lib/openai";
import { calcularCreditos } from "@/lib/creditos";
import { obtenerTextoCatalogoExterno } from "@/lib/stock-api";

/** Endpoint de prueba: enviá agenteId + mensaje (sin WhatsApp). */
export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const { agenteId, mensaje } = (await req.json()) as { agenteId?: string; mensaje?: string };
  if (!agenteId || !mensaje?.trim()) {
    return NextResponse.json({ error: "agenteId y mensaje requeridos" }, { status: 400 });
  }

  const agente = await prisma.agente.findFirst({
    where: { id: agenteId, empresaId: ctx.empresaId, activo: true },
  });
  if (!agente) return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });

  const [archivos, empresaRow] = await Promise.all([
    prisma.archivoConocimiento.findMany({
      where: {
        empresaId: ctx.empresaId,
        OR: [{ agenteId: agente.id }, { agenteId: null }],
      },
    }),
    prisma.empresa.findUnique({
      where: { id: ctx.empresaId },
      select: {
        nombre: true,
        stockApiUrl: true,
        stockApiToken: true,
        stockApiKeyHeader: true,
        chatIaPausado: true,
      },
    }),
  ]);
  if (empresaRow?.chatIaPausado) {
    return NextResponse.json(
      { error: "El chat con IA está pausado para esta empresa. Reactivalo en Configuración." },
      { status: 403 }
    );
  }
  const desdeArchivos = archivos.map((a) => (a.contenido ? a.contenido : `[${a.nombre}]`)).join("\n\n");
  const desdeErp =
    empresaRow && agente.busquedaProductos !== false
      ? await obtenerTextoCatalogoExterno(empresaRow)
      : "";
  const conocimiento = [desdeArchivos, desdeErp].filter(Boolean).join("\n\n");
  const systemPrompt = construirSystemPrompt(agente, conocimiento, empresaRow?.nombre);

  const { texto, tokensTotal } = await generarRespuestaAgente({
    systemPrompt,
    historial: [],
    mensajeUsuario: mensaje.trim(),
    model: agente.modeloOpenai,
    temperature: agente.temperatura,
    maxTokens: agente.maxTokens,
  });

  const creditos = calcularCreditos(tokensTotal);
  await prisma.empresa.update({
    where: { id: ctx.empresaId },
    data: { creditosUsados: { increment: creditos } },
  });

  return NextResponse.json({ respuesta: texto, tokensTotal, creditos });
}
