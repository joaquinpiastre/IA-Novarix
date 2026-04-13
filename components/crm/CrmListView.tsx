"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ContactoCrmFull } from "./ContactoCard";

type SortKey = "nombre" | "canal" | "etapa" | "valor" | "ultimo" | "proximo";

const labelsOrigen: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  MANUAL: "Manual",
  IMPORTADO: "Importado",
};

function labelOrigen(o: string) {
  return labelsOrigen[o] ?? o;
}

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

type Props = {
  contactos: ContactoCrmFull[];
  etapaNombre: (etapaId: string | null | undefined) => string;
};

function compare(a: string | number | null, b: string | number | null, dir: number) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * dir;
  return String(a).localeCompare(String(b), "es") * dir;
}

export function CrmListView({ contactos, etapaNombre }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("ultimo");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(key === "nombre" || key === "canal" || key === "etapa" ? 1 : -1);
    }
  }

  const sorted = useMemo(() => {
    const rows = [...contactos];
    const dir = sortDir;
    rows.sort((x, y) => {
      switch (sortKey) {
        case "nombre":
          return compare(x.nombre || x.numero, y.nombre || y.numero, dir);
        case "canal":
          return compare(x.origen, y.origen, dir);
        case "etapa":
          return compare(etapaNombre(x.etapaId), etapaNombre(y.etapaId), dir);
        case "valor":
          return compare(x.valorOportunidad ?? null, y.valorOportunidad ?? null, dir);
        case "ultimo":
          return compare(x.ultimaInteraccion, y.ultimaInteraccion, dir);
        case "proximo":
          return compare(x.proximoSeguimiento, y.proximoSeguimiento, dir);
        default:
          return 0;
      }
    });
    return rows;
  }, [contactos, sortKey, sortDir, etapaNombre]);

  function Th({ k, children }: { k: SortKey; children: React.ReactNode }) {
    const active = sortKey === k;
    return (
      <th className="p-3">
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={`flex w-full items-center gap-1 text-left font-medium transition-colors ${
            active ? "text-white" : "text-[#C4B5FD] hover:text-white"
          }`}
        >
          {children}
          {active ? <span className="text-[10px] text-[#A855F7]">{sortDir === 1 ? "↑" : "↓"}</span> : null}
        </button>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/40">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[#7B2FF7]/20 text-[#7C6FAE]">
          <tr>
            <Th k="nombre">Nombre</Th>
            <Th k="canal">Canal</Th>
            <Th k="etapa">Etapa</Th>
            <Th k="valor">Valor</Th>
            <Th k="ultimo">Último contacto</Th>
            <Th k="proximo">Próximo seguimiento</Th>
          </tr>
        </thead>
        <tbody className="text-[#C4B5FD]">
          {sorted.map((c) => (
            <tr key={c.id} className="border-b border-[#7B2FF7]/10 hover:bg-[#2D0A5E]/30">
              <td className="p-3">
                <Link href={`/crm/contactos/${c.id}`} className="font-medium text-white hover:text-[#A855F7]">
                  {c.nombre?.trim() || c.numero}
                </Link>
                <p className="text-xs text-[#7C6FAE]">{c.numero}</p>
              </td>
              <td className="p-3">{labelOrigen(c.origen)}</td>
              <td className="p-3">{etapaNombre(c.etapaId)}</td>
              <td className="p-3 font-mono text-xs text-white">
                {c.valorOportunidad != null
                  ? `$${c.valorOportunidad.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                  : "—"}
              </td>
              <td className="p-3 text-xs">{fmtFecha(c.ultimaInteraccion)}</td>
              <td className="p-3 text-xs">{fmtFecha(c.proximoSeguimiento)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sorted.length ? <p className="p-6 text-center text-[#7C6FAE]">No hay contactos con los filtros actuales.</p> : null}
    </div>
  );
}
