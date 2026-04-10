import { prisma } from "@/lib/db";

/**
 * Chats disponibles como fuente de contexto al armar cotizaciones.
 * Si la empresa desactiva grupos, solo se listan conversaciones 1:1.
 */
export async function conversacionesParaCotizacion(empresaId: string) {
  const emp = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { cotizacionIncluyeGrupos: true },
  });
  const incluirGrupos = emp?.cotizacionIncluyeGrupos ?? true;
  return prisma.conversacion.findMany({
    where: {
      empresaId,
      ...(incluirGrupos ? {} : { esGrupo: false }),
    },
    orderBy: { ultimoMensaje: "desc" },
    take: 300,
    select: {
      id: true,
      numeroCliente: true,
      nombreCliente: true,
      esGrupo: true,
      ultimoMensaje: true,
      mensajes: true,
    },
  });
}
