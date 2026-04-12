import Link from "next/link";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

export type ContactoKanban = {
  id: string;
  nombre: string | null;
  numero: string;
  valorOportunidad: number | null;
  ultimaInteraccion: string;
  etapaId?: string | null;
};

function tiempoDesde(iso: string) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const h = Math.floor(diff / 3600000);
  if (h < 24) return h <= 0 ? "ahora" : `hace ${h} h`;
  const days = Math.floor(h / 24);
  return `hace ${days} d`;
}

type DragHandle = {
  listeners?: DraggableSyntheticListeners;
  attributes?: DraggableAttributes;
};

export function ContactoCard({ contacto, dragHandle }: { contacto: ContactoKanban; dragHandle?: DragHandle }) {
  const label = contacto.nombre?.trim() || contacto.numero;
  return (
    <div
      className={`
        flex gap-1 rounded-lg border border-[#7B2FF7]/30 bg-[#2D0A5E]/50 shadow-[0_0_16px_rgba(123,47,247,0.08)]
        backdrop-blur-md transition hover:border-[#7B2FF7]/50
      `}
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none items-center px-1 text-[#7C6FAE] hover:text-[#C4B5FD] active:cursor-grabbing"
        aria-label="Arrastrar"
        {...dragHandle?.listeners}
        {...dragHandle?.attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Link href={`/crm/contactos/${contacto.id}`} className="min-w-0 flex-1 py-3 pr-3">
        <p className="font-medium text-white">{label}</p>
        <p className="mt-1 text-xs text-[#7C6FAE]">{tiempoDesde(contacto.ultimaInteraccion)}</p>
        {contacto.valorOportunidad != null && contacto.valorOportunidad > 0 ? (
          <p className="mt-1 text-sm text-[#C4B5FD]">
            ${contacto.valorOportunidad.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
          </p>
        ) : null}
      </Link>
    </div>
  );
}
