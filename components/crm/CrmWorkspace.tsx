"use client";

import { useMemo, useState } from "react";
import { CrmBoard } from "./CrmBoard";
import { CrmListView } from "./CrmListView";
import type { ContactoCrmFull } from "./ContactoCard";
import type { EtapaKanban } from "./PipelineKanban";
import { Input } from "@/components/ui/Input";

type CanalFiltro = "" | "WHATSAPP" | "INSTAGRAM" | "FACEBOOK" | "MANUAL";
type FechaFiltro = "" | "hoy" | "semana" | "mes";
type VistaCrm = "kanban" | "lista";

type Props = {
  etapas: EtapaKanban[];
  contactos: ContactoCrmFull[];
};

function inicioDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function filtrarContactos(
  contactos: ContactoCrmFull[],
  canal: CanalFiltro,
  fecha: FechaFiltro,
  busqueda: string
): ContactoCrmFull[] {
  const q = busqueda.trim().toLowerCase();
  const now = Date.now();
  let desdeMs = 0;
  if (fecha === "hoy") desdeMs = inicioDia(new Date());
  else if (fecha === "semana") desdeMs = now - 7 * 24 * 60 * 60 * 1000;
  else if (fecha === "mes") desdeMs = now - 30 * 24 * 60 * 60 * 1000;

  return contactos.filter((c) => {
    if (canal && c.origen !== canal) return false;
    if (fecha) {
      const t = new Date(c.ultimaInteraccion).getTime();
      if (t < desdeMs) return false;
    }
    if (q) {
      const nombre = (c.nombre ?? "").toLowerCase();
      const num = c.numero.toLowerCase();
      if (!nombre.includes(q) && !num.includes(q)) return false;
    }
    return true;
  });
}

export function CrmWorkspace({ etapas, contactos }: Props) {
  const [canal, setCanal] = useState<CanalFiltro>("");
  const [fecha, setFecha] = useState<FechaFiltro>("");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<VistaCrm>("kanban");

  const filtrados = useMemo(
    () => filtrarContactos(contactos, canal, fecha, busqueda),
    [contactos, canal, fecha, busqueda]
  );

  const etapaNombre = useMemo(() => {
    const m = new Map(etapas.map((e) => [e.id, e.nombre]));
    return (id: string | null | undefined) => (id && m.get(id)) || "—";
  }, [etapas]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/50 p-4 backdrop-blur-sm md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-[#C4B5FD]">Canal</label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as CanalFiltro)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/80 px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los canales</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="MANUAL">Manual</option>
          </select>
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-[#C4B5FD]">Última interacción</label>
          <select
            value={fecha}
            onChange={(e) => setFecha(e.target.value as FechaFiltro)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/80 px-3 py-2 text-sm text-white"
          >
            <option value="">Cualquier fecha</option>
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
          </select>
        </div>
        <div className="min-w-[200px] flex-[2]">
          <label className="mb-1 block text-xs text-[#C4B5FD]">Buscar</label>
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre o número…"
            className="border-[#7B2FF7]/30 bg-[#0A0118]/80"
          />
        </div>
        <div className="flex min-w-[200px] items-center gap-1 rounded-lg border border-[#7B2FF7]/30 bg-[#0A0118]/60 p-1">
          <button
            type="button"
            onClick={() => setVista("kanban")}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              vista === "kanban" ? "bg-[#7B2FF7]/40 text-white" : "text-[#C4B5FD] hover:text-white"
            }`}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setVista("lista")}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              vista === "lista" ? "bg-[#7B2FF7]/40 text-white" : "text-[#C4B5FD] hover:text-white"
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {vista === "kanban" ? <CrmBoard etapas={etapas} contactos={filtrados} /> : null}
      {vista === "lista" ? <CrmListView contactos={filtrados} etapaNombre={etapaNombre} /> : null}
    </div>
  );
}
