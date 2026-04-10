"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

const MODELOS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
] as const;

export function AdminAgenteEditor({ agenteId }: { agenteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [empresaLabel, setEmpresaLabel] = useState("");

  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [codigoActivacion, setCodigoActivacion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptTenant, setPromptTenant] = useState("");
  const [permiteTransferencia, setPermiteTransferencia] = useState(false);
  const [busquedaProductos, setBusquedaProductos] = useState(true);
  const [activo, setActivo] = useState(true);
  const [esDefault, setEsDefault] = useState(false);
  const [temperatura, setTemperatura] = useState(0.6);
  const [modeloOpenai, setModeloOpenai] = useState("gpt-4o-mini");
  const [maxTokens, setMaxTokens] = useState(1024);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/admin/agentes/${agenteId}`);
      if (!r.ok) {
        setLoading(false);
        return;
      }
      const a = await r.json();
      setEmpresaLabel(`${a.empresa?.nombre ?? ""} · ${a.empresa?.email ?? ""}`);
      setNombre(a.nombre ?? "");
      setSlug(a.slug ?? "");
      setDescripcion(a.descripcion ?? "");
      setCodigoActivacion(a.codigoActivacion ?? "");
      setPrompt(a.prompt ?? "");
      setPromptTenant(a.promptTenant ?? "");
      setPermiteTransferencia(!!a.permiteTransferencia);
      setBusquedaProductos(a.busquedaProductos !== false);
      setActivo(!!a.activo);
      setEsDefault(!!a.esDefault);
      setTemperatura(typeof a.temperatura === "number" ? a.temperatura : 0.6);
      setModeloOpenai(a.modeloOpenai ?? "gpt-4o-mini");
      setMaxTokens(typeof a.maxTokens === "number" ? a.maxTokens : 1024);
      setLoading(false);
    })();
  }, [agenteId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const r = await fetch(`/api/admin/agentes/${agenteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        slug: slug || null,
        descripcion: descripcion || null,
        codigoActivacion: codigoActivacion || null,
        prompt,
        promptTenant: promptTenant || null,
        permiteTransferencia,
        busquedaProductos,
        activo,
        esDefault,
        temperatura,
        modeloOpenai,
        maxTokens,
      }),
    });
    setSaving(false);
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Guardado correctamente." : j.error ?? "Error al guardar.");
    if (r.ok) router.refresh();
  }

  if (loading) return <p className="text-[#7C6FAE]">Cargando bot…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/agentes" className="text-sm text-[#A855F7] hover:underline">
            ← Volver a Bots
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{nombre || "Bot"}</h1>
          <p className="text-sm text-[#7C6FAE]">{empresaLabel}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Identidad</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nombre del bot" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <Input
              label="Slug (opcional)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="martin-pintureria"
            />
          </div>
          <div className="mt-4">
            <Textarea
              label="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <Input
            className="mt-4"
            label="Palabra clave de ruteo"
            value={codigoActivacion}
            onChange={(e) => setCodigoActivacion(e.target.value)}
            placeholder="Ej.: PINTURERIA — para enrutar mensajes a este agente"
          />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Comportamiento</h2>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
              <input
                type="checkbox"
                checked={permiteTransferencia}
                onChange={(e) => setPermiteTransferencia(e.target.checked)}
                className="rounded border-[#7B2FF7]/50"
              />
              Permitir transferencia / derivación a otros agentes o humanos
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
              <input
                type="checkbox"
                checked={busquedaProductos}
                onChange={(e) => setBusquedaProductos(e.target.checked)}
                className="rounded border-[#7B2FF7]/50"
              />
              Habilitar búsqueda de productos (consulta la API de stock del tenant al responder)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="rounded border-[#7B2FF7]/50"
              />
              Activo
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
              <input
                type="checkbox"
                checked={esDefault}
                onChange={(e) => setEsDefault(e.target.checked)}
                className="rounded border-[#7B2FF7]/50"
              />
              Agente por defecto del tenant
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Prompt del sistema</h2>
          <Textarea
            label="Instrucciones principales"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[200px]"
            required
          />
          <div className="mt-4">
            <Textarea
              label="Prompt del tenant (se anexa al system)"
              value={promptTenant}
              onChange={(e) => setPromptTenant(e.target.value)}
              placeholder="Reglas solo para esta empresa: horarios, tono, prohibiciones…"
              className="min-h-[120px]"
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Modelo</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-[#C4B5FD]">Temperatura</label>
              <input
                type="number"
                step={0.1}
                min={0}
                max={2}
                value={temperatura}
                onChange={(e) => setTemperatura(parseFloat(e.target.value) || 0)}
                className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#C4B5FD]">Modelo OpenAI</label>
              <select
                value={modeloOpenai}
                onChange={(e) => setModeloOpenai(e.target.value)}
                className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white"
              >
                {MODELOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#C4B5FD]">Max tokens</label>
              <input
                type="number"
                min={256}
                max={8192}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 1024)}
                className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
        {msg ? <p className="text-sm text-[#A855F7]">{msg}</p> : null}
      </form>
    </div>
  );
}
