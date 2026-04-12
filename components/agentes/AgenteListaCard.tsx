"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Props = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  esDefault: boolean;
  conversaciones: number;
};

export function AgenteListaCard({ id, nombre, descripcion, activo, esDefault, conversaciones }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function onEliminar(e: React.MouseEvent) {
    e.preventDefault();
    if (!window.confirm(`¿Eliminar el agente "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const r = await fetch(`/api/agentes/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      window.alert(typeof j.error === "string" ? j.error : "No se pudo eliminar");
      return;
    }
    router.refresh();
  }

  return (
    <Card className="flex h-full flex-col p-0 transition hover:border-[#7B2FF7]/60">
      <Link href={`/agentes/${id}`} className="block flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">{nombre}</h2>
          <Badge variant={activo ? "activo" : "inactivo"}>{activo ? "Activo" : "Inactivo"}</Badge>
        </div>
        {descripcion ? <p className="mt-2 line-clamp-2 text-sm text-[#C4B5FD]">{descripcion}</p> : null}
        <p className="mt-4 text-xs text-[#7C6FAE]">
          {conversaciones} conversaciones {esDefault ? " · Agente por defecto" : ""}
        </p>
      </Link>
      <div className="flex justify-end border-t border-[#7B2FF7]/20 px-4 py-3">
        <Button type="button" variant="danger" size="sm" disabled={deleting} onClick={onEliminar}>
          {deleting ? "Eliminando…" : "Eliminar"}
        </Button>
      </div>
    </Card>
  );
}
