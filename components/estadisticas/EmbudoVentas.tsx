"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type EmbudoItem = { nombre: string; cantidad: number; color: string; porcentaje: number };

export function EmbudoVentas({ etapas }: { etapas: EmbudoItem[] }) {
  return (
    <div className="h-[420px] w-full rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/30 p-4 backdrop-blur-md">
      <h2 className="mb-4 text-lg font-semibold text-white">Embudo de ventas</h2>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart layout="vertical" data={etapas} margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#7B2FF7" opacity={0.2} />
          <XAxis type="number" stroke="#7C6FAE" tick={{ fill: "#C4B5FD", fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="nombre"
            width={120}
            stroke="#7C6FAE"
            tick={{ fill: "#C4B5FD", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#2D0A5E",
              border: "1px solid rgba(123,47,247,0.4)",
              borderRadius: 8,
              color: "#fff",
            }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const p = payload[0].payload as EmbudoItem;
              return (
                <div className="rounded-lg border border-[#7B2FF7]/40 bg-[#2D0A5E] px-3 py-2 text-sm text-white">
                  <p className="font-medium">{p.nombre}</p>
                  <p className="text-[#C4B5FD]">
                    {p.cantidad} contactos ({p.porcentaje} %)
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
            {etapas.map((e, i) => (
              <Cell key={e.nombre + i} fill={e.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
