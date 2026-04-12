"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function VistaPrevia({
  usarIA,
  promptMensaje,
  mensajeFijo,
}: {
  usarIA: boolean;
  promptMensaje: string;
  mensajeFijo: string;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function generar() {
    setErr("");
    setLoading(true);
    const r = await fetch("/api/seguimientos/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usarIA,
        promptMensaje: promptMensaje || null,
        mensajeFijo: mensajeFijo || null,
      }),
    });
    setLoading(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(typeof j.error === "string" ? j.error : "No se pudo generar");
      setTexto(null);
      return;
    }
    setTexto(typeof j.texto === "string" ? j.texto : "");
  }

  return (
    <div className="rounded-lg border border-[#7B2FF7]/25 bg-[#0A0118]/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={generar}>
          {loading ? "Generando…" : "Vista previa"}
        </Button>
        {err ? <span className="text-sm text-red-400">{err}</span> : null}
      </div>
      {texto != null ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-[#C4B5FD]">{texto || "(vacío)"}</p>
      ) : null}
    </div>
  );
}
