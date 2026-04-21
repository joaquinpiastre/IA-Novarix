"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { ContactoCrmFull } from "./ContactoCard";
import { Button } from "@/components/ui/Button";

type SortKey = "nombre" | "email" | "empresa" | "canal" | "etapa" | "valor" | "ultimo" | "proximo";

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
  onContactDeleted?: () => void;
};

function compare(a: string | number | null, b: string | number | null, dir: number) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * dir;
  return String(a).localeCompare(String(b), "es") * dir;
}

const PAGE_OPTIONS = [25, 50, 100] as const;

export function CrmListView({ contactos, etapaNombre, onContactDeleted }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("ultimo");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_OPTIONS)[number]>(25);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(key === "nombre" || key === "email" || key === "empresa" || key === "canal" || key === "etapa" ? 1 : -1);
    }
  }

  const sorted = useMemo(() => {
    const rows = [...contactos];
    const dir = sortDir;
    rows.sort((x, y) => {
      switch (sortKey) {
        case "nombre":
          return compare(x.nombre || x.numero, y.nombre || y.numero, dir);
        case "email":
          return compare(x.email || "", y.email || "", dir);
        case "empresa":
          return compare(x.empresaCliente || "", y.empresaCliente || "", dir);
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

  useEffect(() => {
    setPage(1);
  }, [contactos.length, sortKey, sortDir, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  async function eliminarContacto(id: string, label: string) {
    if (
      !window.confirm(
        `¿Eliminar a "${label}" del CRM?\n\nSe borrará el contacto y su historial de etapas; las conversaciones quedarán sin vincular. No se puede deshacer.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const r = await fetch(`/api/crm/contactos/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        window.alert((j as { error?: string }).error ?? "No se pudo eliminar.");
        return;
      }
      onContactDeleted?.();
    } finally {
      setDeletingId(null);
    }
  }

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#9B8FC4]">
        <div className="flex flex-wrap items-center gap-2">
          <span>Filas por página</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_OPTIONS)[number])}
            className="rounded-md border border-[#7B2FF7]/35 bg-[#0A0118]/80 px-2 py-1.5 text-sm text-white"
          >
            {PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <p>
          {sorted.length ? (
            <>
              Mostrando <span className="text-white">{start + 1}</span>–
              <span className="text-white">{Math.min(start + pageSize, sorted.length)}</span> de{" "}
              <span className="text-white">{sorted.length}</span>
            </>
          ) : (
            "Sin filas"
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/40">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-[#7B2FF7]/20 text-[#7C6FAE]">
            <tr>
              <Th k="nombre">Nombre</Th>
              <Th k="email">Email</Th>
              <Th k="empresa">Empresa</Th>
              <Th k="canal">Canal</Th>
              <Th k="etapa">Etapa</Th>
              <Th k="valor">Valor</Th>
              <Th k="ultimo">Último contacto</Th>
              <Th k="proximo">Próximo seguimiento</Th>
              <th className="w-14 p-3 text-right font-medium text-[#C4B5FD]">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-[#C4B5FD]">
            {pageRows.map((c) => (
              <tr key={c.id} className="border-b border-[#7B2FF7]/10 hover:bg-[#2D0A5E]/30">
                <td className="p-3">
                  <Link href={`/crm/contactos/${c.id}`} className="font-medium text-white hover:text-[#A855F7]">
                    {c.nombre?.trim() || c.numero}
                  </Link>
                  <p className="font-mono text-xs text-[#7C6FAE]">{c.numero}</p>
                </td>
                <td className="max-w-[140px] truncate p-3 text-xs" title={c.email ?? ""}>
                  {c.email?.trim() || "—"}
                </td>
                <td className="max-w-[120px] truncate p-3 text-xs" title={c.empresaCliente ?? ""}>
                  {c.empresaCliente?.trim() || "—"}
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
                <td className="p-3 text-right">
                  <button
                    type="button"
                    title="Eliminar del CRM"
                    disabled={deletingId === c.id}
                    onClick={() => void eliminarContacto(c.id, c.nombre?.trim() || c.numero)}
                    className="inline-flex rounded-md p-2 text-[#7C6FAE] transition hover:bg-rose-950/50 hover:text-rose-200 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sorted.length ? (
          <p className="p-6 text-center text-[#7C6FAE]">No hay contactos con los filtros actuales.</p>
        ) : null}
      </div>

      {sorted.length > pageSize ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-xs text-[#9B8FC4]">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      ) : null}
    </div>
  );
}
