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
  const [horasSinRespuesta, setHorasSinRespuesta] = useState("48");
  const [etapaDisparoId, setEtapaDisparoId] = useState(etapas[0]?.id ?? "");
  const [soloEstosNumeros, setSoloEstosNumeros] = useState(false);
  const [numerosTexto, setNumerosTexto] = useState("");
  const [omitirGanadosPerdidos, setOmitirGanadosPerdidos] = useState(true);
  const [usarIA, setUsarIA] = useState(true);
  const [promptMensaje, setPromptMensaje] = useState(
    "Escribí un mensaje corto para retomar contacto con {nombre} si todavía le interesa lo que consultó."
  );
  const [mensajeFijo, setMensajeFijo] = useState("Hola {nombre}, ¿querés que sigamos con tu consulta?");
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
      etapaDisparoId: ["TIEMPO_EN_ETAPA"].includes(disparador) ? etapaDisparoId || null : null,
      diasEnEtapa: disparador === "TIEMPO_EN_ETAPA" ? parseInt(diasEnEtapa, 10) || null : null,
      horasSinRespuesta: disparador === "SIN_RESPUESTA" ? parseInt(horasSinRespuesta, 10) || null : null,
      moverAEtapaId: moverAEtapa ? moverAEtapaId || null : null,
      soloEstosNumeros,
      numerosTexto: soloEstosNumeros ? numerosTexto : "",
      omitirGanadosPerdidos,
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
    <form onSubmit={guardar} className="mx-auto max-w-2xl space-y-8">
      <div className="rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/50 p-4">
        <h3 className="text-sm font-semibold text-white">¿A quién aplica esta regla?</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#9B8FC4]">
          Las reglas <strong className="text-[#C4B5FD]">generales</strong> miran a todos los contactos que cumplan la
          condición. Si elegís <strong className="text-[#C4B5FD]">solo ciertos números</strong>, el mensaje solo se
          evalúa para esa lista (útil para campañas puntuales). Cuando el cliente te escribe de nuevo, se actualiza la
          última interacción: la opción “sin respuesta” no dispara si hubo mensaje reciente.
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#C4B5FD]">
            <input
              type="radio"
              name="ambito"
              checked={!soloEstosNumeros}
              onChange={() => setSoloEstosNumeros(false)}
              className="mt-1 border-[#7B2FF7]/50 bg-[#0A0118]"
            />
            <span>
              <span className="font-medium text-white">Regla general</span> — todos los contactos que cumplan el
              disparador (respetando la casilla de ganado/perdido abajo).
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#C4B5FD]">
            <input
              type="radio"
              name="ambito"
              checked={soloEstosNumeros}
              onChange={() => setSoloEstosNumeros(true)}
              className="mt-1 border-[#7B2FF7]/50 bg-[#0A0118]"
            />
            <span>
              <span className="font-medium text-white">Solo estos teléfonos o claves</span> — una por línea (WhatsApp
              con o sin +15; Messenger <code className="text-white">m:…</code>; Instagram{" "}
              <code className="text-white">ig:…</code>).
            </span>
          </label>
        </div>
        {soloEstosNumeros ? (
          <Textarea
            label="Números (lista)"
            value={numerosTexto}
            onChange={(e) => setNumerosTexto(e.target.value)}
            className="mt-3 min-h-[120px]"
            placeholder={"5492615551234\nm:1234567890"}
          />
        ) : null}
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[#C4B5FD]">
          <input
            type="checkbox"
            checked={omitirGanadosPerdidos}
            onChange={(e) => setOmitirGanadosPerdidos(e.target.checked)}
            className="mt-1 rounded border-[#7B2FF7]/50 bg-[#0A0118]"
          />
          <span>
            <span className="font-medium text-white">No enviar si está en etapa Ganado o Perdido</span>{" "}
            <span className="text-[#7C6FAE]">
              (recomendado: así no molestás a quien ya compró o descartaste en el embudo).
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-4">
        <Input label="Nombre de la regla" value={nombre} onChange={(e) => setNombre(e.target.value)} required />

        <div>
          <label className="mb-1 block text-sm text-[#C4B5FD]">Cuándo enviar</label>
          <select
            value={disparador}
            onChange={(e) => setDisparador(e.target.value as TipoDisparador)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white"
          >
            <option value="SIN_RESPUESTA">Hace varias horas que el cliente no escribe</option>
            <option value="TIEMPO_EN_ETAPA">Lleva varios días quieto en la misma etapa del embudo</option>
            <option value="FECHA_PROGRAMADA">Cuando venza la fecha “próximo seguimiento” del contacto (CRM)</option>
          </select>
          <p className="mt-1 text-xs text-[#7C6FAE]">
            Cada regla se envía una sola vez por contacto. Si necesitás algo más avanzado, contactá al equipo.
          </p>
        </div>

        {disparador === "TIEMPO_EN_ETAPA" ? (
          <>
            <Input
              label="Días sin que el cliente interactúe (misma etapa)"
              type="number"
              min={1}
              value={diasEnEtapa}
              onChange={(e) => setDiasEnEtapa(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm text-[#C4B5FD]">Etapa del embudo</label>
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
          <div>
            <Input
              label="Horas sin mensaje del cliente"
              type="number"
              min={1}
              value={horasSinRespuesta}
              onChange={(e) => setHorasSinRespuesta(e.target.value)}
            />
            <p className="mt-1 text-xs text-[#7C6FAE]">
              Se usa la última vez que el cliente interactuó (WhatsApp / Meta / manual). Si respondió hace poco, no
              entra en la regla.
            </p>
          </div>
        ) : null}

        {disparador === "FECHA_PROGRAMADA" ? (
          <p className="text-sm leading-relaxed text-[#C4B5FD]">
            En la ficha del contacto en el CRM cargá <strong className="text-white">próximo seguimiento</strong>. Cuando
            esa fecha pase, el sistema puede enviar este mensaje una vez por contacto.
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-white">Mensaje</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
            <input
              type="radio"
              checked={usarIA}
              onChange={() => setUsarIA(true)}
              className="border-[#7B2FF7]/50 bg-[#0A0118]"
            />
            Texto generado por IA (según tu instrucción)
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
          <Textarea label="Qué querés que diga la IA" value={promptMensaje} onChange={(e) => setPromptMensaje(e.target.value)} />
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
          Después de enviar, mover el contacto a otra etapa
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
      </div>

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
