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
  tiempoPromedioEnEtapaEntradaSalida?: {
    etapaId: string;
    etapa: string;
    diasPromedio: number | null;
    muestras: number;
  }[];
  transicionesPromedioEtapas?: {
    deEtapa: string;
    aEtapa: string;
    diasPromedio: number | null;
    muestras: number;
  }[];
  valorOportunidadSumaPorEtapa?: { etapaId: string; etapa: string; sumaValor: number }[];
  velocidadConversionProspectoAGanado?: { diasPromedio: number | null; muestras: number };
  valorPipelineResumen?: {
    totalValorNumerico: number;
    pipelineAbierto: number;
    ganadoEsteMes: number;
    enNegociacion: number;
  };
};

function fmtArs(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

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

      {data.transicionesPromedioEtapas != null ? (
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-white">Tiempo promedio por etapa</h2>
          <p className="mb-4 text-xs text-[#7C6FAE]">
            Días entre la primera vez que el contacto entra en una etapa y la primera vez que entra en la
            siguiente (orden del embudo). Basado en <strong className="text-[#C4B5FD]">HistorialEtapa</strong>.
          </p>
          <ul className="space-y-2 text-sm text-[#C4B5FD]">
            {data.transicionesPromedioEtapas.length === 0 ? (
              <li className="text-[#7C6FAE]">Necesitás al menos dos etapas y movimientos en el historial para calcular transiciones.</li>
            ) : null}
            {data.transicionesPromedioEtapas.map((t) => (
              <li key={`${t.deEtapa}-${t.aEtapa}`} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#7B2FF7]/10 py-2">
                <span>
                  <span className="text-white">{t.deEtapa}</span>
                  <span className="mx-1 text-[#7C6FAE]">→</span>
                  <span className="text-white">{t.aEtapa}</span>
                  {t.muestras > 0 ? (
                    <span className="ml-2 text-[10px] text-[#7C6FAE]">({t.muestras} contactos)</span>
                  ) : null}
                </span>
                <span className="font-mono text-white">{t.diasPromedio != null ? `${t.diasPromedio} días` : "—"}</span>
              </li>
            ))}
          </ul>
          {data.tiempoPromedioEnEtapaEntradaSalida && data.tiempoPromedioEnEtapaEntradaSalida.some((x) => x.muestras > 0) ? (
            <div className="mt-4 border-t border-[#7B2FF7]/20 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#C026D3]">
                Días promedio dentro de cada etapa (hasta el próximo movimiento)
              </p>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-xs text-[#C4B5FD]">
                {data.tiempoPromedioEnEtapaEntradaSalida.map((r) =>
                  r.muestras > 0 ? (
                    <li key={r.etapaId} className="flex justify-between gap-2">
                      <span className="text-white">{r.etapa}</span>
                      <span>
                        {r.diasPromedio != null ? `${r.diasPromedio} días` : "—"}{" "}
                        <span className="text-[#7C6FAE]">({r.muestras})</span>
                      </span>
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          ) : null}
          {data.velocidadConversionProspectoAGanado &&
          (data.velocidadConversionProspectoAGanado.muestras > 0 ||
            data.velocidadConversionProspectoAGanado.diasPromedio != null) ? (
            <p className="mt-4 border-t border-[#7B2FF7]/20 pt-3 text-xs text-[#C4B5FD]">
              <strong className="text-white">Velocidad de conversión</strong> (desde etapa inicial del embudo
              hasta &quot;Ganado&quot;):{" "}
              <span className="text-white">
                {data.velocidadConversionProspectoAGanado.diasPromedio != null
                  ? `${data.velocidadConversionProspectoAGanado.diasPromedio} días promedio`
                  : "—"}
              </span>
              {data.velocidadConversionProspectoAGanado.muestras > 0 ? (
                <span className="text-[#7C6FAE]">
                  {" "}
                  · {data.velocidadConversionProspectoAGanado.muestras} contacto(s) con cierre ganado
                </span>
              ) : null}
            </p>
          ) : null}
        </Card>
      ) : null}

      {data.valorPipelineResumen ? (
        <Card>
          <h2 className="mb-2 text-lg font-semibold text-white">Valor en pipeline</h2>
          <p className="mb-4 text-xs text-[#7C6FAE]">
            Suma de <strong className="text-[#C4B5FD]">valorOportunidad</strong> con valor cargado. Pipeline
            abierto = sin etapa ganada ni perdida.
          </p>
          <ul className="space-y-2 text-sm text-[#C4B5FD]">
            <li className="flex justify-between border-b border-[#7B2FF7]/10 py-2">
              <span>Total con monto</span>
              <span className="font-medium text-white">{fmtArs(data.valorPipelineResumen.totalValorNumerico)}</span>
            </li>
            <li className="flex justify-between border-b border-[#7B2FF7]/10 py-2">
              <span>Pipeline abierto</span>
              <span className="font-medium text-white">{fmtArs(data.valorPipelineResumen.pipelineAbierto)}</span>
            </li>
            <li className="flex justify-between border-b border-[#7B2FF7]/10 py-2">
              <span>Ganado este mes</span>
              <span className="font-medium text-emerald-300">{fmtArs(data.valorPipelineResumen.ganadoEsteMes)}</span>
            </li>
            <li className="flex justify-between py-2">
              <span>En negociación</span>
              <span className="font-medium text-white">{fmtArs(data.valorPipelineResumen.enNegociacion)}</span>
            </li>
          </ul>
          {data.valorOportunidadSumaPorEtapa && data.valorOportunidadSumaPorEtapa.length > 0 ? (
            <div className="mt-4 border-t border-[#7B2FF7]/20 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#C026D3]">
                Suma por etapa (solo con valor)
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-[#C4B5FD]">
                {data.valorOportunidadSumaPorEtapa.map((r) => (
                  <li key={r.etapaId} className="flex justify-between gap-2">
                    <span>{r.etapa}</span>
                    <span className="shrink-0 text-white">{fmtArs(r.sumaValor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

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
