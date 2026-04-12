"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Etapa = {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  esGanado: boolean;
  esPerdido: boolean;
};

function SortableRow({
  etapa,
  onPatch,
  onDelete,
  otrasEtapas,
}: {
  etapa: Etapa;
  onPatch: (id: string, data: Partial<Etapa>) => Promise<void>;
  onDelete: (id: string, moverA: string) => Promise<void>;
  otrasEtapas: Etapa[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: etapa.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };
  const [nombre, setNombre] = useState(etapa.nombre);
  const [color, setColor] = useState(etapa.color);
  const [moverA, setMoverA] = useState(otrasEtapas[0]?.id ?? "");

  useEffect(() => {
    setNombre(etapa.nombre);
    setColor(etapa.color);
  }, [etapa.nombre, etapa.color]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="mb-3 flex flex-col gap-3 rounded-lg border border-[#7B2FF7]/25 bg-[#2D0A5E]/40 p-4 md:flex-row md:items-end"
    >
      <button
        type="button"
        className="h-10 w-10 shrink-0 cursor-grab rounded border border-[#7B2FF7]/30 text-[#7C6FAE]"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
      >
        ::
      </button>
      <div className="grid flex-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-[#C4B5FD]">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-2 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#C4B5FD]">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full max-w-[120px] cursor-pointer rounded border border-[#7B2FF7]/30 bg-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-xs text-[#C4B5FD]">
            <input
              type="checkbox"
              checked={etapa.esGanado}
              onChange={(e) => onPatch(etapa.id, { esGanado: e.target.checked })}
            />
            Ganada
          </label>
          <label className="flex items-center gap-2 text-xs text-[#C4B5FD]">
            <input
              type="checkbox"
              checked={etapa.esPerdido}
              onChange={(e) => onPatch(etapa.id, { esPerdido: e.target.checked })}
            />
            Perdida
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onPatch(etapa.id, { nombre, color })}
        >
          Guardar nombre/color
        </Button>
        {otrasEtapas.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={moverA}
              onChange={(e) => setMoverA(e.target.value)}
              className="max-w-[200px] rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-2 py-1 text-xs text-white"
            >
              {otrasEtapas.map((o) => (
                <option key={o.id} value={o.id}>
                  Contactos → {o.nombre}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" variant="danger" onClick={() => onDelete(etapa.id, moverA)}>
              Eliminar etapa
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function EtapasConfigClient({ etapas: inicial }: { etapas: Etapa[] }) {
  const router = useRouter();
  const [items, setItems] = useState(inicial);
  const firma = useMemo(() => inicial.map((e) => e.id).join(","), [inicial]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `firma` resume cambios de datos del servidor
  useEffect(() => {
    setItems(inicial);
  }, [firma]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function persistOrder(ordered: Etapa[]) {
    const ordenIds = ordered.map((e) => e.id);
    await fetch("/api/crm/etapas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordenIds }),
    });
    router.refresh();
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldI = items.findIndex((x) => x.id === active.id);
    const newI = items.findIndex((x) => x.id === over.id);
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(items, oldI, newI);
    setItems(next);
    void persistOrder(next);
  }

  async function onPatch(id: string, data: Partial<Etapa>) {
    await fetch(`/api/crm/etapas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...data } : x)));
    router.refresh();
  }

  async function onDelete(id: string, moverA: string) {
    if (!window.confirm("¿Eliminar esta etapa? Los contactos pasarán a la etapa elegida.")) return;
    await fetch(`/api/crm/etapas/${id}?moverContactosA=${encodeURIComponent(moverA)}`, {
      method: "DELETE",
    });
    setItems((prev) => prev.filter((x) => x.id !== id));
    router.refresh();
  }

  async function agregar() {
    const nombre = window.prompt("Nombre de la nueva etapa");
    if (!nombre?.trim()) return;
    const r = await fetch("/api/crm/etapas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    if (r.ok) router.refresh();
  }

  async function restaurar() {
    if (!window.confirm("Se borrarán etapas actuales y el historial de etapas. ¿Continuar?")) return;
    await fetch("/api/crm/etapas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurarDefecto: true }),
    });
    router.refresh();
  }

  return (
    <Card>
      <div className="mb-6 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={agregar}>
          Agregar etapa
        </Button>
        <Button type="button" variant="secondary" onClick={restaurar}>
          Restaurar etapas por defecto
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((etapa) => (
            <SortableRow
              key={etapa.id}
              etapa={etapa}
              onPatch={onPatch}
              onDelete={onDelete}
              otrasEtapas={items.filter((x) => x.id !== etapa.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </Card>
  );
}
