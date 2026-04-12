"use client";

type Props = {
  totalContactos: number;
  ganadosEsteMes: number;
  tasaConversion: number;
  valorTotalGanado: number;
};

export function MetricasCards({ totalContactos, ganadosEsteMes, tasaConversion, valorTotalGanado }: Props) {
  const cards = [
    { label: "Total contactos", value: String(totalContactos) },
    { label: "Ganados este mes", value: String(ganadosEsteMes) },
    { label: "Tasa conversión", value: `${tasaConversion} %` },
    {
      label: "Valor total ganado",
      value: `$${valorTotalGanado.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-[#7B2FF7]/30 bg-gradient-to-br from-[#2D0A5E]/60 to-[#4A1A9E]/30 p-5 shadow-[0_0_20px_rgba(123,47,247,0.12)] backdrop-blur-md"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[#7C6FAE]">{c.label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
