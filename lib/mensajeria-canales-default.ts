import { prisma } from "@/lib/db";

const DEFAULTS = [
  { nombre: "General", icono: "💬", tipo: "general", descripcion: "Chat general del equipo" },
  { nombre: "Anuncios", icono: "📢", tipo: "anuncios", descripcion: "Avisos importantes" },
  { nombre: "Ventas", icono: "🎯", tipo: "general", descripcion: "Canal de ventas" },
] as const;

export async function ensureCanalesPorDefecto(empresaId: string) {
  const n = await prisma.canalInterno.count({ where: { empresaId } });
  if (n > 0) return;
  await prisma.canalInterno.createMany({
    data: DEFAULTS.map((c) => ({
      empresaId,
      nombre: c.nombre,
      icono: c.icono,
      tipo: c.tipo,
      descripcion: c.descripcion,
      miembros: [],
    })),
  });
}
