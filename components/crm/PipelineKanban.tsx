"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ContactoCard, type ContactoKanban } from "./ContactoCard";

export type EtapaKanban = { id: string; nombre: string; color: string; orden: number };

function colId(etapaId: string) {
  return `col-${etapaId}`;
}

function DroppableColumn({
  etapa,
  children,
  totalValor,
  count,
}: {
  etapa: EtapaKanban;
  children: React.ReactNode;
  totalValor: number;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colId(etapa.id) });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[420px] w-72 shrink-0 flex-col rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/40 p-3 backdrop-blur-md ${
        isOver ? "ring-2 ring-[#A855F7]/50" : ""
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-[#7B2FF7]/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: etapa.color }} />
          <h2 className="text-sm font-semibold text-white">{etapa.nombre}</h2>
        </div>
      </div>
      <p className="mb-1 text-xs text-[#C4B5FD]/80">{count} contactos</p>
      <p className="mb-2 text-xs text-[#7C6FAE]">
        {totalValor > 0 ? `$${totalValor.toLocaleString("es-AR", { maximumFractionDigits: 0 })}` : "—"}
      </p>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

function DraggableContacto({ contacto }: { contacto: ContactoKanban }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contacto.id,
  });
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.85 : 1,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style}>
      <ContactoCard contacto={contacto} dragHandle={{ listeners, attributes }} />
    </div>
  );
}

type Props = {
  etapas: EtapaKanban[];
  contactos: ContactoKanban[];
  onMover: (contactoId: string, nuevaEtapaId: string) => Promise<void>;
};

export function PipelineKanban({ etapas, contactos: inicial, onMover }: Props) {
  const [contactos, setContactos] = useState(inicial);
  const [saving, setSaving] = useState(false);

  const firma = useMemo(() => inicial.map((c) => `${c.id}:${c.etapaId ?? ""}`).join("|"), [inicial]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `firma` resume cambios de datos del servidor
  useEffect(() => {
    setContactos(inicial);
  }, [firma]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const listasPorEtapa = useMemo(() => {
    const firstId = etapas[0]?.id;
    const map = new Map<string, ContactoKanban[]>();
    for (const e of etapas) map.set(e.id, []);
    for (const c of contactos) {
      const eid = c.etapaId ?? firstId;
      if (eid && map.has(eid)) map.get(eid)!.push({ ...c, etapaId: eid });
      else if (firstId) map.get(firstId)!.push({ ...c, etapaId: firstId });
    }
    return map;
  }, [contactos, etapas]);

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const contactoId = String(active.id);
    const overId = String(over.id);
    if (!overId.startsWith("col-")) return;
    const nuevaEtapaId = overId.slice(4);
    const c = contactos.find((x) => x.id === contactoId);
    const effectiveOld = c?.etapaId ?? etapas[0]?.id;
    if (!c || effectiveOld === nuevaEtapaId) return;
    const prev = contactos;
    setContactos((list) =>
      list.map((x) => (x.id === contactoId ? { ...x, etapaId: nuevaEtapaId } : x))
    );
    setSaving(true);
    try {
      await onMover(contactoId, nuevaEtapaId);
    } catch {
      setContactos(prev);
    } finally {
      setSaving(false);
    }
  }

  if (!etapas.length) {
    return <p className="text-[#7C6FAE]">No hay etapas configuradas.</p>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {saving ? (
        <p className="mb-2 text-xs text-[#A855F7]">Guardando movimiento…</p>
      ) : null}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {etapas.map((etapa) => {
          const lista = listasPorEtapa.get(etapa.id) ?? [];
          const totalValor = lista.reduce((s, c) => s + (c.valorOportunidad ?? 0), 0);
          return (
            <DroppableColumn key={etapa.id} etapa={etapa} totalValor={totalValor} count={lista.length}>
              {lista.map((c) => (
                <DraggableContacto key={c.id} contacto={c} />
              ))}
            </DroppableColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
