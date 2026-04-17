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
  const [testMensaje, setTestMensaje] = useState("Hola, ¿qué horarios tienen?");
  const [testLoading, setTestLoading] = useState(false);
  const [testRespuesta, setTestRespuesta] = useState("");
  const [testMeta, setTestMeta] = useState("");
  const [testError, setTestError] = useState("");

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

  async function probarRespuestaBot() {
    if (!agenteId) return;
    setTestError("");
    setTestRespuesta("");
    setTestMeta("");
    setTestLoading(true);
    const r = await fetch("/api/ai/responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agenteId, mensaje: testMensaje.trim() }),
    });
    const j = await r.json().catch(() => ({}));
    setTestLoading(false);
    if (!r.ok) {
      setTestError(typeof j.error === "string" ? j.error : "No se pudo obtener respuesta.");
      return;
    }
    setTestRespuesta(typeof j.respuesta === "string" ? j.respuesta : "");
    const creditos = typeof j.creditos === "number" ? j.creditos : null;
    const tokens = typeof j.tokensTotal === "number" ? j.tokensTotal : null;
    setTestMeta(
      [creditos != null ? `Créditos: ${creditos}` : null, tokens != null ? `Tokens: ${tokens}` : null]
        .filter(Boolean)
        .join(" · ") || ""
    );
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
          <>
          <div className="mt-10 space-y-4 border-t border-[#7B2FF7]/20 pt-8">
            <h3 className="text-sm font-semibold text-white">Probar respuesta del bot</h3>
            <p className="text-sm leading-relaxed text-[#7C6FAE]">
              Usa el mismo armado que en WhatsApp / Meta:{" "}
              <strong className="text-[#C4B5FD]">prompt y ajustes guardados en el servidor</strong>, más
              archivos de conocimiento vinculados a este agente (y globales) y la API de stock si el agente la
              tiene habilitada. Si cambiaste el prompt arriba, guardá el agente antes de probar.
            </p>
            <Textarea
              label="Mensaje de prueba (como si lo enviara un cliente)"
              value={testMensaje}
              onChange={(e) => setTestMensaje(e.target.value)}
              rows={4}
              className="min-h-[6rem] resize-y"
            />
            <Button type="button" variant="secondary" disabled={testLoading || !testMensaje.trim()} onClick={() => void probarRespuestaBot()}>
              {testLoading ? "Generando…" : "Enviar y ver respuesta"}
            </Button>
            {testError ? <p className="text-sm text-red-400">{testError}</p> : null}
            {testRespuesta ? (
              <div className="rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/60 p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#7C6FAE]">Respuesta del modelo</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#E9D5FF]">{testRespuesta}</p>
                {testMeta ? <p className="mt-3 text-xs text-[#7C6FAE]">{testMeta}</p> : null}
              </div>
            ) : null}
          </div>
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
          </>
        ) : null}
      </form>
    </Card>
  );
}
