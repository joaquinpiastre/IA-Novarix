"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CrmBoard } from "./CrmBoard";
import { CrmListView } from "./CrmListView";
import type { ContactoCrmFull } from "./ContactoCard";
import type { EtapaKanban } from "./PipelineKanban";
import { ModalNuevoContacto } from "./ModalNuevoContacto";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Download } from "lucide-react";

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
      const mail = (c.email ?? "").toLowerCase();
      const emp = (c.empresaCliente ?? "").toLowerCase();
      if (
        !nombre.includes(q) &&
        !num.includes(q) &&
        !mail.includes(q) &&
        !emp.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}

export function CrmWorkspace({ etapas, contactos }: Props) {
  const router = useRouter();
  const [canal, setCanal] = useState<CanalFiltro>("");
  const [fecha, setFecha] = useState<FechaFiltro>("");
  const [busqueda, setBusqueda] = useState("");
  const [vista, setVista] = useState<VistaCrm>("kanban");
  const [exporting, setExporting] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);

  const filtrados = useMemo(
    () => filtrarContactos(contactos, canal, fecha, busqueda),
    [contactos, canal, fecha, busqueda]
  );

  const etapaNombre = useMemo(() => {
    const m = new Map(etapas.map((e) => [e.id, e.nombre]));
    return (id: string | null | undefined) => (id && m.get(id)) || "—";
  }, [etapas]);

  const stats = useMemo(() => {
    const total = contactos.length;
    const visibles = filtrados.length;
    const valorPipeline = filtrados.reduce((s, c) => s + (c.valorOportunidad ?? 0), 0);
    return { total, visibles, valorPipeline };
  }, [contactos.length, filtrados]);

  async function descargarExcel() {
    setExporting(true);
    try {
      const r = await fetch("/api/crm/contactos/export", { credentials: "include" });
      if (!r.ok) {
        window.alert("No se pudo generar el Excel. Probá de nuevo o revisá tu sesión.");
        return;
      }
      const blob = await r.blob();
      const cd = r.headers.get("Content-Disposition");
      const m = cd?.match(/filename="?([^";]+)"?/i);
      const name = m?.[1]?.replace(/UTF-8''/, "") || `crm-contactos-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = decodeURIComponent(name);
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function onMoverKanban(contactoId: string, nuevaEtapaId: string) {
    const r = await fetch("/api/crm/mover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactoId, nuevaEtapaId }),
    });
    if (!r.ok) throw new Error("No se pudo mover");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#7C6FAE]">Cartera</p>
          <p className="mt-1 text-2xl font-semibold text-white">{stats.total}</p>
          <p className="text-xs text-[#9B8FC4]">contactos en la empresa</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#7C6FAE]">Vista actual</p>
          <p className="mt-1 text-2xl font-semibold text-white">{stats.visibles}</p>
          <p className="text-xs text-[#9B8FC4]">tras filtros de canal, fecha y búsqueda</p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#7C6FAE]">Valor en vista</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {stats.valorPipeline > 0
              ? `$${stats.valorPipeline.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
              : "—"}
          </p>
          <p className="text-xs text-[#9B8FC4]">suma de oportunidades filtradas</p>
        </div>
        <div className="flex flex-col justify-center gap-2 sm:col-span-2 lg:col-span-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={exporting || stats.total === 0}
            className="w-full justify-center gap-2 sm:w-auto"
            onClick={() => void descargarExcel()}
          >
            <Download className="h-4 w-4 shrink-0" />
            {exporting ? "Generando…" : "Excel · base completa"}
          </Button>
          <p className="text-[10px] leading-snug text-[#7C6FAE]">
            Incluye nombre, teléfono/clave, email, empresa, etapa, origen, fechas y notas (exporta todos los contactos
            de tu cuenta).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => setModalNuevo(true)}>
          Nuevo contacto
        </Button>
        <Link href="/crm/configuracion">
          <Button type="button" variant="secondary">
            Configurar etapas
          </Button>
        </Link>
      </div>

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
            placeholder="Nombre, número, email o empresa…"
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

      {vista === "kanban" ? (
        <CrmBoard etapas={etapas} contactos={filtrados} onMover={onMoverKanban} />
      ) : null}
      {vista === "lista" ? (
        <CrmListView
          contactos={filtrados}
          etapaNombre={etapaNombre}
          onContactDeleted={() => router.refresh()}
        />
      ) : null}

      <ModalNuevoContacto
        etapas={etapas}
        open={modalNuevo}
        onClose={() => setModalNuevo(false)}
        onCreated={() => {
          setModalNuevo(false);
          router.refresh();
        }}
      />
    </div>
  );
}
