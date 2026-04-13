import type { HistorialEtapa } from "@prisma/client";
import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Días promedio dentro de cada etapa: desde entrada (fila historial) hasta siguiente cambio (solo estadías cerradas). */
export async function tiempoPromedioEnEtapaEntradaSalida(empresaId: string) {
  const [historial, etapas] = await Promise.all([
    prisma.historialEtapa.findMany({
      where: { contacto: { empresaId } },
      orderBy: [{ contactoId: "asc" }, { cambiadoEn: "asc" }],
    }),
    prisma.etapaCRM.findMany({
      where: { empresaId },
      select: { id: true, nombre: true, orden: true },
      orderBy: { orden: "asc" },
    }),
  ]);

  const duraciones = new Map<string, number[]>();
  const byContact = new Map<string, HistorialEtapa[]>();
  for (const h of historial) {
    const arr = byContact.get(h.contactoId) ?? [];
    arr.push(h);
    byContact.set(h.contactoId, arr);
  }

  for (const [, rows] of Array.from(byContact.entries())) {
    rows.sort((a: HistorialEtapa, b: HistorialEtapa) => a.cambiadoEn.getTime() - b.cambiadoEn.getTime());
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i];
      const next = rows[i + 1];
      if (!next || !cur.etapaNueva) continue;
      const dias = (next.cambiadoEn.getTime() - cur.cambiadoEn.getTime()) / DAY_MS;
      const key = cur.etapaNueva;
      const arr = duraciones.get(key) ?? [];
      arr.push(dias);
      duraciones.set(key, arr);
    }
  }

  return etapas.map((e) => {
    const arr = duraciones.get(e.id) ?? [];
    const diasPromedio =
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
    return { etapaId: e.id, etapa: e.nombre, diasPromedio, muestras: arr.length };
  });
}

/** Promedio de días entre primera vez en etapa[i] y primera vez en etapa[i+1] (orden del embudo). */
export async function transicionesPromedioEntreEtapasConsecutivas(empresaId: string) {
  const [etapas, contactoIds] = await Promise.all([
    prisma.etapaCRM.findMany({ where: { empresaId }, orderBy: { orden: "asc" } }),
    prisma.contacto.findMany({ where: { empresaId }, select: { id: true } }),
  ]);
  if (etapas.length < 2) return [];

  const historial = await prisma.historialEtapa.findMany({
    where: { contacto: { empresaId } },
    orderBy: [{ contactoId: "asc" }, { cambiadoEn: "asc" }],
  });
  const byContact = new Map<string, HistorialEtapa[]>();
  for (const h of historial) {
    const arr = byContact.get(h.contactoId) ?? [];
    arr.push(h);
    byContact.set(h.contactoId, arr);
  }

  const buckets = etapas.slice(0, -1).map(() => [] as number[]);

  for (const { id: cid } of contactoIds) {
    const rows = byContact.get(cid) ?? [];
    const first = new Map<string, Date>();
    for (const row of rows) {
      if (!row.etapaNueva) continue;
      if (!first.has(row.etapaNueva)) first.set(row.etapaNueva, row.cambiadoEn);
    }
    for (let i = 0; i < etapas.length - 1; i++) {
      const idA = etapas[i].id;
      const idB = etapas[i + 1].id;
      const tA = first.get(idA);
      const tB = first.get(idB);
      if (tA && tB && tB.getTime() > tA.getTime()) {
        buckets[i].push((tB.getTime() - tA.getTime()) / DAY_MS);
      }
    }
  }

  return etapas.slice(0, -1).map((e, i) => {
    const arr = buckets[i];
    const diasPromedio =
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
    return {
      deEtapa: e.nombre,
      aEtapa: etapas[i + 1].nombre,
      diasPromedio,
      muestras: arr.length,
    };
  });
}

/** SUM(valorOportunidad) por etapa, solo contactos con valor no nulo. */
export async function valorOportunidadSumaPorEtapa(empresaId: string) {
  const grouped = await prisma.contacto.groupBy({
    by: ["etapaId"],
    where: {
      empresaId,
      valorOportunidad: { not: null },
      etapaId: { not: null },
    },
    _sum: { valorOportunidad: true },
  });
  const etapas = await prisma.etapaCRM.findMany({
    where: { empresaId },
    select: { id: true, nombre: true },
  });
  const nombre = new Map(etapas.map((x) => [x.id, x.nombre]));
  return grouped
    .filter((g) => g.etapaId)
    .map((g) => ({
      etapaId: g.etapaId!,
      etapa: nombre.get(g.etapaId!) ?? g.etapaId!,
      sumaValor: g._sum.valorOportunidad ?? 0,
    }))
    .sort((a, b) => a.etapa.localeCompare(b.etapa));
}

/** Días promedio desde primera entrada a la etapa de menor orden hasta primera entrada a etapa ganada. */
export async function velocidadConversionProspectoAGanado(empresaId: string) {
  const [etapasOrden, ganada] = await Promise.all([
    prisma.etapaCRM.findMany({
      where: { empresaId },
      orderBy: { orden: "asc" },
      select: { id: true },
    }),
    prisma.etapaCRM.findFirst({
      where: { empresaId, esGanado: true },
      select: { id: true },
    }),
  ]);
  if (!ganada || etapasOrden.length === 0) {
    return { diasPromedio: null as number | null, muestras: 0 };
  }
  const primeraEtapaId = etapasOrden[0].id;

  const contactos = await prisma.contacto.findMany({
    where: { empresaId },
    select: { id: true, creadoEn: true },
  });

  const historial = await prisma.historialEtapa.findMany({
    where: { contacto: { empresaId } },
    orderBy: [{ contactoId: "asc" }, { cambiadoEn: "asc" }],
  });
  const byContact = new Map<string, HistorialEtapa[]>();
  for (const h of historial) {
    const arr = byContact.get(h.contactoId) ?? [];
    arr.push(h);
    byContact.set(h.contactoId, arr);
  }

  const diasList: number[] = [];

  for (const c of contactos) {
    const rows = byContact.get(c.id) ?? [];
    let tProspecto: Date | null = null;
    let tGanado: Date | null = null;
    for (const row of rows) {
      if (row.etapaNueva === primeraEtapaId && !tProspecto) tProspecto = row.cambiadoEn;
      if (row.etapaNueva === ganada.id && !tGanado) tGanado = row.cambiadoEn;
    }
    if (!tProspecto) tProspecto = c.creadoEn;
    if (!tGanado) continue;
    if (tGanado.getTime() < tProspecto.getTime()) continue;
    diasList.push((tGanado.getTime() - tProspecto.getTime()) / DAY_MS);
  }

  const muestras = diasList.length;
  const diasPromedio =
    muestras > 0 ? Math.round((diasList.reduce((a, b) => a + b, 0) / muestras) * 10) / 10 : null;
  return { diasPromedio, muestras };
}

export type ValorPipelineResumen = {
  totalValorNumerico: number;
  pipelineAbierto: number;
  ganadoEsteMes: number;
  enNegociacion: number;
};

export async function valorPipelineResumenCalc(empresaId: string): Promise<ValorPipelineResumen> {
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const ganada = await prisma.etapaCRM.findFirst({
    where: { empresaId, esGanado: true },
    select: { id: true },
  });

  const [etapas, contactos, historialGanado] = await Promise.all([
    prisma.etapaCRM.findMany({
      where: { empresaId },
      select: { id: true, nombre: true, esGanado: true, esPerdido: true },
    }),
    prisma.contacto.findMany({
      where: { empresaId, valorOportunidad: { not: null } },
      select: { id: true, etapaId: true, valorOportunidad: true },
    }),
    ganada
      ? prisma.historialEtapa.findMany({
          where: { contacto: { empresaId }, etapaNueva: ganada.id },
          orderBy: { cambiadoEn: "asc" },
          select: { contactoId: true, cambiadoEn: true },
        })
      : Promise.resolve([] as { contactoId: string; cambiadoEn: Date }[]),
  ]);

  const mapE = new Map(etapas.map((e) => [e.id, e]));
  const primeraVezGanado = new Map<string, Date>();
  for (const h of historialGanado) {
    if (!primeraVezGanado.has(h.contactoId)) primeraVezGanado.set(h.contactoId, h.cambiadoEn);
  }
  const idsGanadoEsteMes = new Set(
    Array.from(primeraVezGanado.entries())
      .filter(([, d]) => d.getTime() >= inicioMes.getTime())
      .map(([id]) => id)
  );

  let totalValorNumerico = 0;
  let pipelineAbierto = 0;
  let ganadoEsteMes = 0;
  let enNegociacion = 0;

  const etapaNegociando = etapas.find((e) => e.nombre.toLowerCase().includes("negoci"));

  for (const c of contactos) {
    const v = c.valorOportunidad ?? 0;
    totalValorNumerico += v;
    const et = c.etapaId ? mapE.get(c.etapaId) : null;
    if (et && !et.esGanado && !et.esPerdido) pipelineAbierto += v;
    if (idsGanadoEsteMes.has(c.id)) ganadoEsteMes += v;
    if (etapaNegociando && c.etapaId === etapaNegociando.id) enNegociacion += v;
  }

  return {
    totalValorNumerico,
    pipelineAbierto,
    ganadoEsteMes,
    enNegociacion,
  };
}
