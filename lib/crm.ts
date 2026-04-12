import { prisma } from "@/lib/db";
import type { OrigenContacto } from "@prisma/client";

/** Garantiza que la empresa tenga el embudo por defecto (idempotente). */
export async function asegurarEtapasPorDefecto(empresaId: string) {
  const n = await prisma.etapaCRM.count({ where: { empresaId } });
  if (n === 0) await crearEtapasPorDefecto(empresaId);
}

export async function obtenerOCrearContacto(
  empresaId: string,
  numero: string,
  nombre?: string | null,
  origen: OrigenContacto = "WHATSAPP"
) {
  await asegurarEtapasPorDefecto(empresaId);

  let contacto = await prisma.contacto.findUnique({
    where: { empresaId_numero: { empresaId, numero } },
  });

  if (!contacto) {
    const primeraEtapa = await prisma.etapaCRM.findFirst({
      where: { empresaId },
      orderBy: { orden: "asc" },
    });

    contacto = await prisma.contacto.create({
      data: {
        empresaId,
        numero,
        nombre: nombre?.trim() || null,
        etapaId: primeraEtapa?.id ?? null,
        origen,
      },
    });
  }

  await prisma.contacto.update({
    where: { id: contacto.id },
    data: {
      ultimaInteraccion: new Date(),
      ...(nombre?.trim() ? { nombre: nombre.trim() } : {}),
    },
  });

  return prisma.contacto.findUniqueOrThrow({ where: { id: contacto.id } });
}

export async function moverContactoEtapa(contactoId: string, nuevaEtapaId: string) {
  const contacto = await prisma.contacto.findUnique({ where: { id: contactoId } });
  if (!contacto) throw new Error("Contacto no encontrado");
  if (contacto.etapaId === nuevaEtapaId) return contacto;

  await prisma.historialEtapa.create({
    data: {
      contactoId,
      etapaAnterior: contacto.etapaId ?? null,
      etapaNueva: nuevaEtapaId,
    },
  });

  return prisma.contacto.update({
    where: { id: contactoId },
    data: { etapaId: nuevaEtapaId },
  });
}

export async function crearEtapasPorDefecto(empresaId: string) {
  const etapasDefecto = [
    { nombre: "Prospecto", color: "#7C6FAE", orden: 0, esGanado: false, esPerdido: false },
    { nombre: "Interesado", color: "#7B2FF7", orden: 1, esGanado: false, esPerdido: false },
    { nombre: "Presupuestado", color: "#A855F7", orden: 2, esGanado: false, esPerdido: false },
    { nombre: "Negociando", color: "#C026D3", orden: 3, esGanado: false, esPerdido: false },
    { nombre: "Ganado", color: "#10B981", orden: 4, esGanado: true, esPerdido: false },
    { nombre: "Perdido", color: "#EF4444", orden: 5, esGanado: false, esPerdido: true },
  ];

  await prisma.etapaCRM.createMany({
    data: etapasDefecto.map((e) => ({ ...e, empresaId })),
  });
}
