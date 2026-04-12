import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

function rangoDesdeQuery(url: URL): { desde: Date; hasta: Date } {
  const hasta = url.searchParams.get("hasta") ? new Date(url.searchParams.get("hasta")!) : new Date();
  const desdeParam = url.searchParams.get("desde");
  let desde: Date;
  if (desdeParam) {
    desde = new Date(desdeParam);
  } else {
    desde = new Date(hasta);
    desde.setDate(desde.getDate() - 30);
  }
  return { desde, hasta };
}

export async function GET(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const { desde, hasta } = rangoDesdeQuery(new URL(req.url));

  const [contactos, etapas, historial, seguimientosRango, seguimientosMes, ganadaEtapa] = await Promise.all([
    prisma.contacto.findMany({
      where: { empresaId: ctx.empresaId },
      include: { etapa: true },
    }),
    prisma.etapaCRM.findMany({ where: { empresaId: ctx.empresaId }, orderBy: { orden: "asc" } }),
    prisma.historialEtapa.findMany({
      where: {
        contacto: { empresaId: ctx.empresaId },
        cambiadoEn: { gte: desde, lte: hasta },
      },
      orderBy: [{ contactoId: "asc" }, { cambiadoEn: "asc" }],
    }),
    prisma.seguimientoEnviado.findMany({
      where: {
        contacto: { empresaId: ctx.empresaId },
        creadoEn: { gte: desde, lte: hasta },
      },
    }),
    prisma.seguimientoEnviado.findMany({
      where: {
        contacto: { empresaId: ctx.empresaId },
        creadoEn: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.etapaCRM.findFirst({ where: { empresaId: ctx.empresaId, esGanado: true } }),
  ]);

  const totalContactos = contactos.length;
  const ganadosEsteMes = ganadaEtapa
    ? contactos.filter((c) => c.etapaId === ganadaEtapa.id && c.creadoEn >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
        .length
    : 0;

  const valorTotalGanado = ganadaEtapa
    ? contactos
        .filter((c) => c.etapaId === ganadaEtapa.id)
        .reduce((s, c) => s + (c.valorOportunidad ?? 0), 0)
    : 0;

  const tasaConversion =
    totalContactos > 0 && ganadaEtapa
      ? Math.round(
          (contactos.filter((c) => c.etapaId === ganadaEtapa.id).length / totalContactos) * 1000
        ) / 10
      : 0;

  const porEtapaMap = new Map<string, { cantidad: number; valorTotal: number; nombre: string; color: string }>();
  for (const e of etapas) {
    porEtapaMap.set(e.id, { cantidad: 0, valorTotal: 0, nombre: e.nombre, color: e.color });
  }
  for (const c of contactos) {
    if (!c.etapaId) continue;
    const row = porEtapaMap.get(c.etapaId);
    if (row) {
      row.cantidad += 1;
      row.valorTotal += c.valorOportunidad ?? 0;
    }
  }

  const contactosPorEtapa = etapas.map((e) => {
    const r = porEtapaMap.get(e.id)!;
    return { etapa: e.nombre, etapaId: e.id, cantidad: r.cantidad, valorTotal: r.valorTotal, color: e.color };
  });

  const duracionesPorEtapa = new Map<string, number[]>();
  const byContact = new Map<string, typeof historial>();
  for (const h of historial) {
    const arr = byContact.get(h.contactoId) ?? [];
    arr.push(h);
    byContact.set(h.contactoId, arr);
  }
  for (const [, rows] of Array.from(byContact.entries())) {
    rows.sort(
      (a: (typeof historial)[number], b: (typeof historial)[number]) =>
        a.cambiadoEn.getTime() - b.cambiadoEn.getTime()
    );
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i];
      const next = rows[i + 1];
      const fin = next ? next.cambiadoEn.getTime() : hasta.getTime();
      const ini = cur.cambiadoEn.getTime();
      const dias = (fin - ini) / (24 * 60 * 60 * 1000);
      const key = cur.etapaNueva;
      const arr = duracionesPorEtapa.get(key) ?? [];
      arr.push(dias);
      duracionesPorEtapa.set(key, arr);
    }
  }

  const promedioTiempoPorEtapa = etapas.map((e) => {
    const arr = duracionesPorEtapa.get(e.id) ?? [];
    const diasPromedio =
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
    return { etapa: e.nombre, etapaId: e.id, diasPromedio };
  });

  const enviados = seguimientosRango.filter((s) => s.estado === "ENVIADO").length;
  const errores = seguimientosRango.filter((s) => s.estado === "ERROR").length;
  const seguimientosStats = {
    enviados,
    errores,
    tasaError: enviados + errores > 0 ? Math.round((errores / (enviados + errores)) * 1000) / 10 : 0,
  };

  const inicio30 = new Date(hasta);
  inicio30.setDate(inicio30.getDate() - 30);
  const nuevosContactos = await prisma.contacto.findMany({
    where: {
      empresaId: ctx.empresaId,
      creadoEn: { gte: inicio30, lte: hasta },
    },
    select: { creadoEn: true },
  });
  const porDia = new Map<string, number>();
  for (const c of nuevosContactos) {
    const d = c.creadoEn.toISOString().slice(0, 10);
    porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const contactosPorDia: { fecha: string; cantidad: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(inicio30);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    contactosPorDia.push({ fecha: key, cantidad: porDia.get(key) ?? 0 });
  }

  const segEnviadosMes = seguimientosMes.filter((s) => s.estado === "ENVIADO").length;
  const proximosProgramados = await prisma.contacto.count({
    where: {
      empresaId: ctx.empresaId,
      proximoSeguimiento: { gte: new Date() },
    },
  });

  return NextResponse.json({
    contactosPorEtapa,
    tasaConversion,
    valorTotalGanado,
    promedioTiempoPorEtapa,
    seguimientosStats,
    contactosPorDia,
    totalContactos,
    ganadosEsteMes,
    seguimientosMes: { enviados: segEnviadosMes },
    proximosSeguimientosProgramados: proximosProgramados,
  });
}
