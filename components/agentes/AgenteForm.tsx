"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { SESSION_KEY_AGENTE_GUARDADO } from "@/components/agentes/AgenteGuardadoBanner";

type Props = { agenteId?: string };

export function AgenteForm({ agenteId }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [esDefault, setEsDefault] = useState(false);
  const [activo, setActivo] = useState(true);
  const [codigoActivacion, setCodigoActivacion] = useState("");
  const [loading, setLoading] = useState(!!agenteId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!agenteId) return;
    (async () => {
      const r = await fetch(`/api/agentes/${agenteId}`);
      if (!r.ok) return;
      const a = await r.json();
      setNombre(a.nombre ?? "");
      setDescripcion(a.descripcion ?? "");
      setPrompt(a.prompt ?? "");
      setEsDefault(!!a.esDefault);
      setActivo(!!a.activo);
      setCodigoActivacion(a.codigoActivacion ?? "");
      setLoading(false);
    })();
  }, [agenteId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = agenteId ? `/api/agentes/${agenteId}` : "/api/agentes";
    const method = agenteId ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        descripcion,
        prompt,
        esDefault,
        activo,
        codigoActivacion: codigoActivacion || null,
      }),
    });
    setSaving(false);
    if (!r.ok) return;
    await r.json();
    try {
      sessionStorage.setItem(SESSION_KEY_AGENTE_GUARDADO, "1");
    } catch {
      /* ignore */
    }
    router.push("/agentes");
  }

  async function onDelete() {
    if (!agenteId) return;
    const ok = window.confirm(
      `¿Eliminar el agente "${nombre || "este agente"}"? Las conversaciones quedarán sin agente asignado y esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setDeleteError("");
    setDeleting(true);
    const r = await fetch(`/api/agentes/${agenteId}`, { method: "DELETE" });
    setDeleting(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setDeleteError(typeof j.error === "string" ? j.error : "No se pudo eliminar");
      return;
    }
    router.push("/agentes");
    router.refresh();
  }

  if (loading) return <p className="text-[#7C6FAE]">Cargando…</p>;

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-6">
        <Input label="Nombre del agente" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <Input
          label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <Textarea
          label="Prompt del sistema"
          placeholder={`Ej.: Sos el asistente de ventas de [empresa]. Respondé dudas sobre horarios, envíos y medios de pago.`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          rows={24}
          className="min-h-[22rem] resize-y"
        />
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
            <input
              type="checkbox"
              checked={esDefault}
              onChange={(e) => setEsDefault(e.target.checked)}
              className="rounded border-[#7B2FF7]/50 bg-[#0A0118]"
            />
            Agente por defecto (si no hay código de activación)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="rounded border-[#7B2FF7]/50 bg-[#0A0118]"
            />
            Activo
          </label>
        </div>
        <Input
          label="Código de activación (opcional)"
          value={codigoActivacion}
          onChange={(e) => setCodigoActivacion(e.target.value)}
          placeholder="Ej.: PROMO2025"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
        {agenteId ? (
          <div className="mt-10 border-t border-[#7B2FF7]/20 pt-8">
            <h3 className="mb-2 text-sm font-semibold text-[#C4B5FD]">Eliminar agente</h3>
            <p className="mb-4 text-sm text-[#7C6FAE]">
              Se borrará la configuración del agente. Los archivos de conocimiento vinculados quedarán sin agente (no se eliminan).
            </p>
            {deleteError ? <p className="mb-3 text-sm text-red-400">{deleteError}</p> : null}
            <Button type="button" variant="danger" disabled={deleting} onClick={onDelete}>
              {deleting ? "Eliminando…" : "Eliminar agente"}
            </Button>
          </div>
        ) : null}
      </form>
    </Card>
  );
}
