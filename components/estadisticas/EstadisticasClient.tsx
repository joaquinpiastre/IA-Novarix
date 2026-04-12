"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmbudoVentas, type EmbudoItem } from "./EmbudoVentas";
import { MetricasCards } from "./MetricasCards";

type ApiData = {
  contactosPorEtapa: { etapa: string; cantidad: number; valorTotal: number; color: string }[];
  tasaConversion: number;
  valorTotalGanado: number;
  promedioTiempoPorEtapa: { etapa: string; diasPromedio: number | null }[];
  seguimientosStats: { enviados: number; errores: number; tasaError: number };
  contactosPorDia: { fecha: string; cantidad: number }[];
  totalContactos: number;
  ganadosEsteMes: number;
  seguimientosMes: { enviados: number };
  proximosSeguimientosProgramados: number;
};

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function EstadisticasClient() {
  const [data, setData] = useState<ApiData | null>(null);
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toIso(d);
  });
  const [hasta, setHasta] = useState(() => toIso(new Date()));
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (d: string, h: string) => {
    setLoading(true);
    const r = await fetch(`/api/estadisticas?desde=${encodeURIComponent(d)}&hasta=${encodeURIComponent(h)}`);
    const j = await r.json();
    setData(j);
    setLoading(false);
  }, []);

  useEffect(() => {
    void cargar(desde, hasta);
  }, [cargar, desde, hasta]);

  function preset(tipo: "semana" | "mes" | "año") {
    const h = new Date();
    const d = new Date();
    if (tipo === "semana") d.setDate(d.getDate() - 7);
    if (tipo === "mes") d.setMonth(d.getMonth() - 1);
    if (tipo === "año") d.setFullYear(d.getFullYear() - 1);
    setDesde(toIso(d));
    setHasta(toIso(h));
  }

  if (loading && !data) {
    return <p className="text-[#7C6FAE]">Cargando estadísticas…</p>;
  }
  if (!data) return <p className="text-red-400">No se pudieron cargar los datos.</p>;

  const totalEnEmbudo = data.contactosPorEtapa.reduce((s, x) => s + x.cantidad, 0) || 1;
  const embudo: EmbudoItem[] = data.contactosPorEtapa.map((e) => ({
    nombre: e.etapa,
    cantidad: e.cantidad,
    color: e.color,
    porcentaje: Math.round((e.cantidad / totalEnEmbudo) * 1000) / 10,
  }));

  return (
    <div className="space-y-8">
      <Card className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs text-[#C4B5FD]">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#C4B5FD]">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white"
          />
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => preset("semana")}>
          Esta semana
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => preset("mes")}>
          Este mes
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => preset("año")}>
          Este año
        </Button>
        <Button type="button" size="sm" disabled={loading} onClick={() => cargar(desde, hasta)}>
          Aplicar
        </Button>
      </Card>

      <MetricasCards
        totalContactos={data.totalContactos}
        ganadosEsteMes={data.ganadosEsteMes}
        tasaConversion={data.tasaConversion}
        valorTotalGanado={data.valorTotalGanado}
      />

      <EmbudoVentas etapas={embudo} />

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Conversión por etapa</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#7B2FF7]/25 text-[#7C6FAE]">
                <th className="pb-2 pr-4">Etapa</th>
                <th className="pb-2 pr-4">Contactos</th>
                <th className="pb-2 pr-4">% del total</th>
                <th className="pb-2 pr-4">Tiempo prom. (días)</th>
                <th className="pb-2">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {data.contactosPorEtapa.map((row) => {
                const prom =
                  data.promedioTiempoPorEtapa.find((p) => p.etapa === row.etapa)?.diasPromedio ?? null;
                return (
                  <tr key={row.etapa} className="border-b border-[#7B2FF7]/10 text-[#C4B5FD]">
                    <td className="py-2 pr-4">{row.etapa}</td>
                    <td className="py-2 pr-4">{row.cantidad}</td>
                    <td className="py-2 pr-4">
                      {Math.round((row.cantidad / totalEnEmbudo) * 1000) / 10} %
                    </td>
                    <td className="py-2 pr-4">{prom != null ? prom : "—"}</td>
                    <td className="py-2">
                      ${row.valorTotal.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Contactos nuevos (30 días)</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.contactosPorDia} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#7B2FF7" opacity={0.2} />
              <XAxis dataKey="fecha" stroke="#7C6FAE" tick={{ fill: "#C4B5FD", fontSize: 10 }} />
              <YAxis stroke="#7C6FAE" tick={{ fill: "#C4B5FD", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#2D0A5E",
                  border: "1px solid rgba(123,47,247,0.4)",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
              <Line type="monotone" dataKey="cantidad" stroke="#A855F7" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Seguimientos</h2>
        <ul className="space-y-2 text-sm text-[#C4B5FD]">
          <li>
            Enviados en el rango: <strong className="text-white">{data.seguimientosStats.enviados}</strong>
          </li>
          <li>
            Errores: <strong className="text-white">{data.seguimientosStats.errores}</strong> (
            {data.seguimientosStats.tasaError} % del subtotal envíos+errores)
          </li>
          <li>
            Enviados este mes: <strong className="text-white">{data.seguimientosMes.enviados}</strong>
          </li>
          <li>
            Próximos seguimientos programados (contactos con fecha futura):{" "}
            <strong className="text-white">{data.proximosSeguimientosProgramados}</strong>
          </li>
        </ul>
      </Card>
    </div>
  );
}
