"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Regla = {
  id: string;
  nombre: string;
  activa: boolean;
  disparador: string;
};

type Ultimo = {
  id: string;
  mensaje: string;
  estado: string;
  enviadoEn: string | null;
  creadoEn: string;
  contacto: { nombre: string | null; numero: string };
  regla: { nombre: string };
};

const disparadorLabel: Record<string, string> = {
  TIEMPO_EN_ETAPA: "Días en etapa",
  SIN_RESPUESTA: "Sin respuesta",
  ETAPA_ESPECIFICA: "Etapa específica",
  FECHA_PROGRAMADA: "Fecha programada",
};

export function SeguimientosClient({
  reglas: inicial,
  ultimos: ultimosInicial,
}: {
  reglas: Regla[];
  ultimos: Ultimo[];
}) {
  const router = useRouter();
  const [reglas, setReglas] = useState(inicial);

  async function toggle(id: string, activa: boolean) {
    await fetch(`/api/seguimientos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !activa }),
    });
    setReglas((r) => r.map((x) => (x.id === id ? { ...x, activa: !activa } : x)));
    router.refresh();
  }

  async function eliminar(id: string) {
    if (!window.confirm("¿Eliminar esta regla?")) return;
    await fetch(`/api/seguimientos/${id}`, { method: "DELETE" });
    setReglas((r) => r.filter((x) => x.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Link href="/seguimientos/nuevo">
          <Button type="button">Nueva regla</Button>
        </Link>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Reglas</h2>
        <div className="space-y-3">
          {reglas.length ? (
            reglas.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[#7B2FF7]/15 py-3"
              >
                <div>
                  <p className="font-medium text-white">{r.nombre}</p>
                  <p className="text-xs text-[#7C6FAE]">{disparadorLabel[r.disparador] ?? r.disparador}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-[#C4B5FD]">
                    <input
                      type="checkbox"
                      checked={r.activa}
                      onChange={() => toggle(r.id, r.activa)}
                    />
                    Activa
                  </label>
                  <Button type="button" size="sm" variant="danger" onClick={() => eliminar(r.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-[#7C6FAE]">No hay reglas. Creá la primera.</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Últimos envíos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#7B2FF7]/25 text-[#7C6FAE]">
                <th className="pb-2 pr-4">Contacto</th>
                <th className="pb-2 pr-4">Regla</th>
                <th className="pb-2 pr-4">Estado</th>
                <th className="pb-2 pr-4">Fecha</th>
                <th className="pb-2">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {ultimosInicial.map((u) => (
                <tr key={u.id} className="border-b border-[#7B2FF7]/10 text-[#C4B5FD]">
                  <td className="py-2 pr-4">{u.contacto.nombre || u.contacto.numero}</td>
                  <td className="py-2 pr-4">{u.regla.nombre}</td>
                  <td className="py-2 pr-4">{u.estado}</td>
                  <td className="py-2 pr-4">
                    {u.enviadoEn
                      ? new Date(u.enviadoEn).toLocaleString("es-AR")
                      : new Date(u.creadoEn).toLocaleString("es-AR")}
                  </td>
                  <td className="max-w-xs truncate py-2">{u.mensaje}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!ultimosInicial.length ? <p className="mt-2 text-[#7C6FAE]">Todavía no hay envíos.</p> : null}
        </div>
      </Card>
    </div>
  );
}
