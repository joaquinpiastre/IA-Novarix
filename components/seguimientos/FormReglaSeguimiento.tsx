"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { VistaPrevia } from "./VistaPrevia";
import type { TipoDisparador } from "@prisma/client";

type EtapaOpt = { id: string; nombre: string };

const VARIABLES = ["{nombre}", "{empresa}", "{etapa_actual}", "{numero}"];

export function FormReglaSeguimiento({ etapas }: { etapas: EtapaOpt[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [disparador, setDisparador] = useState<TipoDisparador>("SIN_RESPUESTA");
  const [diasEnEtapa, setDiasEnEtapa] = useState("3");
  const [horasSinRespuesta, setHorasSinRespuesta] = useState("24");
  const [etapaDisparoId, setEtapaDisparoId] = useState(etapas[0]?.id ?? "");
  const [usarIA, setUsarIA] = useState(true);
  const [promptMensaje, setPromptMensaje] = useState(
    "Escribí un mensaje corto para retomar contacto con {nombre} sobre su consulta."
  );
  const [mensajeFijo, setMensajeFijo] = useState("Hola {nombre}, ¿seguimos con lo que hablamos?");
  const [moverAEtapa, setMoverAEtapa] = useState(false);
  const [moverAEtapaId, setMoverAEtapaId] = useState(etapas[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function insertVar(v: string) {
    if (usarIA) {
      setPromptMensaje((p) => p + v);
    } else {
      setMensajeFijo((p) => p + v);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const body: Record<string, unknown> = {
      nombre,
      disparador,
      usarIA,
      promptMensaje: usarIA ? promptMensaje : null,
      mensajeFijo: !usarIA ? mensajeFijo : null,
      etapaDisparoId: ["TIEMPO_EN_ETAPA", "ETAPA_ESPECIFICA"].includes(disparador) ? etapaDisparoId || null : null,
      diasEnEtapa: disparador === "TIEMPO_EN_ETAPA" ? parseInt(diasEnEtapa, 10) || null : null,
      horasSinRespuesta: disparador === "SIN_RESPUESTA" ? parseInt(horasSinRespuesta, 10) || null : null,
      moverAEtapaId: moverAEtapa ? moverAEtapaId || null : null,
    };
    const r = await fetch("/api/seguimientos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Error al guardar");
      return;
    }
    router.push("/seguimientos");
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className="mx-auto max-w-2xl space-y-6">
      <Input label="Nombre de la regla" value={nombre} onChange={(e) => setNombre(e.target.value)} required />

      <div>
        <label className="mb-1 block text-sm text-[#C4B5FD]">Disparador</label>
        <select
          value={disparador}
          onChange={(e) => setDisparador(e.target.value as TipoDisparador)}
          className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white"
        >
          <option value="TIEMPO_EN_ETAPA">Días en la misma etapa</option>
          <option value="SIN_RESPUESTA">Horas sin respuesta</option>
          <option value="ETAPA_ESPECIFICA">Al entrar a etapa (pendiente de cron avanzado)</option>
          <option value="FECHA_PROGRAMADA">Fecha programada (usa “próximo seguimiento” del contacto)</option>
        </select>
      </div>

      {disparador === "TIEMPO_EN_ETAPA" ? (
        <>
          <Input
            label="Días sin interacción en esa etapa"
            type="number"
            min={1}
            value={diasEnEtapa}
            onChange={(e) => setDiasEnEtapa(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm text-[#C4B5FD]">Etapa</label>
            <select
              value={etapaDisparoId}
              onChange={(e) => setEtapaDisparoId(e.target.value)}
              className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white"
            >
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}

      {disparador === "SIN_RESPUESTA" ? (
        <Input
          label="Horas sin respuesta del cliente"
          type="number"
          min={1}
          value={horasSinRespuesta}
          onChange={(e) => setHorasSinRespuesta(e.target.value)}
        />
      ) : null}

      {disparador === "ETAPA_ESPECIFICA" ? (
        <div>
          <label className="mb-1 block text-sm text-[#C4B5FD]">Etapa de disparo</label>
          <select
            value={etapaDisparoId}
            onChange={(e) => setEtapaDisparoId(e.target.value)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white"
          >
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#7C6FAE]">
            El cron aún no dispara solo al entrar; podés combinar con “días en etapa” o ampliar después.
          </p>
        </div>
      ) : null}

      {disparador === "FECHA_PROGRAMADA" ? (
        <p className="text-sm text-[#C4B5FD]">
          Se enviará a contactos con <strong className="text-white">próximo seguimiento</strong> vencido o igual a
          hoy, una sola vez por regla.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
          <input
            type="radio"
            checked={usarIA}
            onChange={() => setUsarIA(true)}
            className="border-[#7B2FF7]/50 bg-[#0A0118]"
          />
          Generado por IA
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
          <input
            type="radio"
            checked={!usarIA}
            onChange={() => setUsarIA(false)}
            className="border-[#7B2FF7]/50 bg-[#0A0118]"
          />
          Mensaje fijo
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs text-[#7C6FAE]">Variables (clic para insertar)</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVar(v)}
              className="rounded-full border border-[#7B2FF7]/40 bg-[#2D0A5E]/50 px-3 py-1 text-xs text-[#C4B5FD] hover:bg-[#7B2FF7]/20"
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {usarIA ? (
        <Textarea label="Prompt para la IA" value={promptMensaje} onChange={(e) => setPromptMensaje(e.target.value)} />
      ) : (
        <Textarea label="Mensaje fijo" value={mensajeFijo} onChange={(e) => setMensajeFijo(e.target.value)} />
      )}

      <VistaPrevia usarIA={usarIA} promptMensaje={promptMensaje} mensajeFijo={mensajeFijo} />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
        <input
          type="checkbox"
          checked={moverAEtapa}
          onChange={(e) => setMoverAEtapa(e.target.checked)}
          className="rounded border-[#7B2FF7]/50 bg-[#0A0118]"
        />
        Mover contacto al enviar
      </label>
      {moverAEtapa ? (
        <div>
          <label className="mb-1 block text-sm text-[#C4B5FD]">Etapa destino</label>
          <select
            value={moverAEtapaId}
            onChange={(e) => setMoverAEtapaId(e.target.value)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white"
          >
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando…" : "Guardar regla"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
