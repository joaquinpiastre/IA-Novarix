import { NextResponse } from "next/server";
import { requireEmpresaContext } from "@/lib/api-auth";
import { conversacionesParaCotizacion } from "@/lib/cotizacion";

/** Listado de chats para usar como fuente al armar cotizaciones (respeta cotizacionIncluyeGrupos). */
export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const rows = await conversacionesParaCotizacion(ctx.empresaId);
  return NextResponse.json(
    rows.map((r) => {
      const msgs = r.mensajes as { content?: string }[];
      const ultimo = msgs[msgs.length - 1]?.content ?? "";
      return {
        id: r.id,
        numeroCliente: r.numeroCliente,
        nombreCliente: r.nombreCliente,
        esGrupo: r.esGrupo,
        ultimoMensaje: r.ultimoMensaje,
        ultimoMensajePreview: ultimo.slice(0, 200),
      };
    })
  );
}
