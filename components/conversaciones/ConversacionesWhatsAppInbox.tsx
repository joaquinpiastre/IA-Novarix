"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AtencionHumanaEstado, CanalConversacion } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { etiquetaDia, formatRelativo, hashHue, renderRichText } from "@/components/mensajeria/mensajeria-format";

type ThreadMsg = {
  role: string;
  content: string;
  timestamp?: string;
  tipo?: string;
};

export type InboxRow = {
  id: string;
  canal: CanalConversacion;
  numeroCliente: string;
  nombreCliente: string | null;
  ultimoMensaje: string;
  estado: string;
  esGrupo: boolean;
  iaHabilitada: boolean;
  atencionHumana: AtencionHumanaEstado;
  mensajes: unknown;
  agente: { nombre: string; responsableHumano?: string | null } | null;
};

function previewMensajes(mensajes: unknown): string {
  const msgs = (mensajes as { content?: string }[]) ?? [];
  const last = msgs[msgs.length - 1]?.content;
  return last?.trim() || "Sin mensajes";
}

function etiquetaCanal(canal: CanalConversacion): string {
  if (canal === "MESSENGER") return "FB";
  if (canal === "INSTAGRAM") return "IG";
  return "WA";
}

function tituloChat(c: InboxRow): string {
  if (c.nombreCliente?.trim()) return c.nombreCliente.trim();
  return c.numeroCliente;
}

function horaCorta(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  return sameDay
    ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function horaMensaje(iso?: string): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function InboxAvatar({ label, id }: { label: string; id: string }) {
  const h = hashHue(id + label);
  const ini = label.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <div
      className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-inner"
      style={{
        background: `linear-gradient(135deg, hsl(${h},70%,42%), hsl(${(h + 60) % 360},65%,35%))`,
      }}
    >
      {ini}
    </div>
  );
}

function mensajesDelHilo(raw: unknown): ThreadMsg[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      const o = m as Record<string, unknown>;
      const role = typeof o.role === "string" ? o.role : "";
      const content = typeof o.content === "string" ? o.content : "";
      const timestamp = typeof o.timestamp === "string" ? o.timestamp : undefined;
      const tipo = typeof o.tipo === "string" ? o.tipo : undefined;
      return { role, content, timestamp, tipo };
    })
    .filter((m) => m.role && (m.content.trim() || m.tipo));
}

function etiquetaTipo(t?: string): string | null {
  if (!t || t === "text") return null;
  if (t === "audio") return "Audio";
  if (t === "image") return "Imagen";
  if (t === "fallback") return "Sistema";
  return t;
}

/** Intervalo de refresco del hilo abierto (ms). */
const POLL_CONVERSACION_MS = 3500;

function conversacionApiToRow(conv: Record<string, unknown>): InboxRow | null {
  if (conv.id == null) return null;
  const um = conv.ultimoMensaje;
  const ultimoMensaje =
    typeof um === "string"
      ? um
      : um != null
        ? new Date(um as string).toISOString()
        : "";
  const ag = conv.agente as { nombre?: string; responsableHumano?: string | null } | null;
  return {
    id: String(conv.id),
    canal: conv.canal as InboxRow["canal"],
    numeroCliente: String(conv.numeroCliente ?? ""),
    nombreCliente: (conv.nombreCliente as string | null) ?? null,
    ultimoMensaje,
    estado: String(conv.estado ?? ""),
    esGrupo: Boolean(conv.esGrupo),
    iaHabilitada: Boolean(conv.iaHabilitada),
    atencionHumana: (conv.atencionHumana as InboxRow["atencionHumana"]) ?? "NINGUNA",
    mensajes: conv.mensajes ?? [],
    agente:
      ag?.nombre != null
        ? {
            nombre: String(ag.nombre),
            responsableHumano:
              typeof ag.responsableHumano === "string" ? ag.responsableHumano : null,
          }
        : null,
  };
}

export function ConversacionesWhatsAppInbox({ initial }: { initial: InboxRow[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const paramC = sp.get("c");

  const [rows, setRows] = useState<InboxRow[]>(initial);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(paramC || null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (paramC && rows.some((r) => r.id === paramC)) setSelectedId(paramC);
  }, [paramC, rows]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const hiloMensajes = useMemo(
    () => (selected ? mensajesDelHilo(selected.mensajes) : []),
    [selected?.id, selected?.mensajes]
  );

  const threadRef = useRef<HTMLDivElement>(null);
  /** Si el usuario está cerca del final, los nuevos mensajes del poll bajan el scroll automáticamente. */
  const stickToBottomRef = useRef(true);

  const syncThreadScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [selectedId]);

  useLayoutEffect(() => {
    syncThreadScroll();
  }, [selectedId, hiloMensajes.length, syncThreadScroll]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    const pull = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const r = await fetch(`/api/conversaciones/${selectedId}`, { cache: "no-store" });
        if (!r.ok || cancelled) return;
        const j = (await r.json()) as Record<string, unknown>;
        if (j.error || cancelled) return;
        const mapped = conversacionApiToRow(j);
        if (!mapped || cancelled) return;
        setRows((prev) => {
          const i = prev.findIndex((row) => row.id === mapped.id);
          if (i === -1) return [mapped, ...prev];
          const next = [...prev];
          next[i] = mapped;
          return next.sort(
            (a, b) => (Date.parse(b.ultimoMensaje) || 0) - (Date.parse(a.ultimoMensaje) || 0)
          );
        });
      } catch {
        /* red intermitente: ignorar */
      }
    };

    void pull();
    const id = window.setInterval(() => void pull(), POLL_CONVERSACION_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void pull();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [selectedId]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.numeroCliente.toLowerCase().includes(t) ||
        (r.nombreCliente?.toLowerCase().includes(t) ?? false) ||
        previewMensajes(r.mensajes).toLowerCase().includes(t)
    );
  }, [rows, q]);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      const n = new URLSearchParams(sp.toString());
      n.set("c", id);
      router.replace(`/conversaciones?${n.toString()}`, { scroll: false });
    },
    [router, sp]
  );

  async function patch(id: string, body: Record<string, unknown>) {
    setSaving(true);
    setMsg("");
    const r = await fetch(`/api/conversaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setMsg(j.error ?? "No se pudo guardar");
      return;
    }
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const um = j.ultimoMensaje;
        return {
          ...row,
          ...j,
          ultimoMensaje: typeof um === "string" ? um : new Date(um as string).toISOString(),
        };
      })
    );
    setMsg("Listo.");
  }

  return (
    <div className="flex h-[min(760px,calc(100dvh-10rem))] min-h-[280px] w-full flex-col overflow-hidden rounded-xl border border-[#7B2FF7]/25 bg-[#0A0118]/50 lg:flex-row">
      <aside className="flex min-h-0 w-full max-h-[min(300px,42dvh)] flex-shrink-0 flex-col overflow-hidden border-b border-[#7B2FF7]/20 lg:h-full lg:max-h-none lg:max-w-[380px] lg:border-b-0 lg:border-r">
        <div className="border-b border-[#7B2FF7]/15 p-3">
          <input
            type="search"
            placeholder="Buscar por nombre, número o texto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white placeholder:text-[#7C6FAE] focus:border-[#7B2FF7] focus:outline-none focus:ring-1 focus:ring-[#7B2FF7]/50"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((c) => {
            const active = c.id === selectedId;
            const requiereHumano = c.atencionHumana === "ACTIVA";
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className={`relative flex w-full gap-3 border-b border-[#7B2FF7]/10 px-3 py-3 text-left transition hover:bg-[#2D0A5E]/30 ${
                  requiereHumano ? "animate-pulse bg-rose-950/10" : ""
                } ${
                  active ? "bg-[#2D0A5E]/50" : ""
                }`}
              >
                {requiereHumano ? (
                  <span className="absolute right-2 top-2 inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-rose-300/40" />
                ) : null}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7B2FF7] to-[#C026D3] text-sm font-semibold text-white ${
                    requiereHumano ? "ring-2 ring-rose-400/70" : ""
                  }`}
                >
                  {tituloChat(c).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium text-white">{tituloChat(c)}</span>
                    <span className="shrink-0 text-[11px] text-[#7C6FAE]">{horaCorta(c.ultimoMensaje)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[#9B8FC4]">{previewMensajes(c.mensajes)}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded border border-[#7B2FF7]/40 bg-[#2D0A5E]/50 px-1.5 py-0.5 text-[10px] text-[#C4B5FD]">
                      {etiquetaCanal(c.canal)}
                    </span>
                    {c.esGrupo ? (
                      <span className="rounded bg-[#4A1A9E]/60 px-1.5 py-0.5 text-[10px] text-[#C4B5FD]">
                        Grupo
                      </span>
                    ) : null}
                    {!c.iaHabilitada ? (
                      <span className="rounded bg-[#3D2A1A]/80 px-1.5 py-0.5 text-[10px] text-amber-200/90">
                        IA off
                      </span>
                    ) : null}
                    {c.atencionHumana === "ACTIVA" ? (
                      <span className="rounded bg-rose-950/80 px-1.5 py-0.5 text-[10px] text-rose-200">
                        Humano · activa
                      </span>
                    ) : null}
                    {c.atencionHumana === "RESUELTA" ? (
                      <span className="rounded bg-emerald-950/70 px-1.5 py-0.5 text-[10px] text-emerald-200">
                        Humano · resuelta
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
          {!filtered.length ? (
            <p className="p-6 text-center text-sm text-[#7C6FAE]">No hay chats que coincidan.</p>
          ) : null}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:h-full">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center p-4 text-[#7C6FAE]">
            Elegí un chat de la lista (vista tipo WhatsApp Web).
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[#7B2FF7]/15 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-white">{tituloChat(selected)}</h2>
                <span className="rounded border border-[#7B2FF7]/40 px-2 py-0.5 text-xs text-[#C4B5FD]">
                  {etiquetaCanal(selected.canal)}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-[#7C6FAE]">{selected.numeroCliente}</p>
              {selected.atencionHumana === "ACTIVA" ? (
                <p className="mt-2 rounded-md border border-rose-400/40 bg-rose-950/25 px-2.5 py-1.5 text-xs text-rose-200">
                  Derivado a humano:{" "}
                  <strong className="font-semibold text-rose-100">
                    {selected.agente?.responsableHumano?.trim() || "Asesor asignado del sector"}
                  </strong>
                </p>
              ) : null}
              <p className="mt-2 text-xs text-[#7C6FAE]">
                Historial en vivo: se actualiza solo cada unos segundos mientras tenés este chat abierto (también al
                volver a la pestaña).
              </p>
            </div>

            <div
              ref={threadRef}
              onScroll={() => {
                const el = threadRef.current;
                if (!el) return;
                const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
                stickToBottomRef.current = dist < 120;
              }}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#130826]/40 to-[#0A0118] px-3 py-4"
            >
              {!hiloMensajes.length ? (
                <p className="py-8 text-center text-sm text-[#A78BCC]">No hay mensajes en este hilo.</p>
              ) : (
                hiloMensajes.map((m, i) => {
                  const esCliente = m.role === "user";
                  const esAsistente = m.role === "assistant";
                  const extra = etiquetaTipo(m.tipo);
                  const ts = m.timestamp;
                  const cuando =
                    ts && !Number.isNaN(Date.parse(ts)) ? formatRelativo(ts) : horaMensaje(ts);
                  const prev = hiloMensajes[i - 1];
                  const prevTs = prev?.timestamp;
                  const showDay =
                    !!ts &&
                    !Number.isNaN(Date.parse(ts)) &&
                    (!prevTs ||
                      Number.isNaN(Date.parse(prevTs)) ||
                      etiquetaDia(prevTs) !== etiquetaDia(ts));

                  if (!esCliente && !esAsistente) {
                    return (
                      <div key={i}>
                        {showDay ? (
                          <div className="my-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-[rgba(123,47,247,0.2)]" />
                            <span className="text-[11px] text-[#A78BCC]">{etiquetaDia(ts)}</span>
                            <div className="h-px flex-1 bg-[rgba(123,47,247,0.2)]" />
                          </div>
                        ) : null}
                        <div className="msg-enter mb-2 flex justify-center">
                          <p className="max-w-[95%] rounded-xl border border-[rgba(123,47,247,0.2)] bg-[#1A0A35]/90 px-3 py-2 text-center text-xs text-[#A78BCC]">
                            {m.content.trim() || extra || m.role}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const clienteNombre = tituloChat(selected);
                  const bubbleCliente = [
                    "relative px-3 py-2 shadow-lg",
                    "rounded-[18px] rounded-bl-[4px] border-l-2 border-[#7B2FF7]/40 bg-[#1E0D3A] text-white",
                  ].join(" ");
                  const bubbleIa = [
                    "relative px-3 py-2 shadow-lg",
                    "rounded-[18px] rounded-br-[4px] bg-gradient-to-br from-[#7B2FF7] to-[#C026D3] text-white shadow-[#7B2FF7]/25",
                  ].join(" ");

                  return (
                    <div key={i}>
                      {showDay ? (
                        <div className="my-4 flex items-center gap-3">
                          <div className="h-px flex-1 bg-[rgba(123,47,247,0.2)]" />
                          <span className="text-[11px] text-[#A78BCC]">{etiquetaDia(ts)}</span>
                          <div className="h-px flex-1 bg-[rgba(123,47,247,0.2)]" />
                        </div>
                      ) : null}
                      <div
                        className={`msg-enter group relative mb-2 flex w-full ${esCliente ? "justify-start" : "justify-end"}`}
                      >
                        {esCliente ? (
                          <InboxAvatar label={clienteNombre} id={selected.numeroCliente || selected.id} />
                        ) : null}
                        <div className="max-w-[min(85%,520px)]">
                          <div className={esCliente ? bubbleCliente : bubbleIa}>
                            {extra ? (
                              <p
                                className={`mb-1 text-[11px] font-medium ${
                                  esCliente ? "text-[#A78BCC]" : "text-white/85"
                                }`}
                              >
                                {extra}
                              </p>
                            ) : null}
                            <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                              {m.content.trim() ? renderRichText(m.content.trim()) : "—"}
                            </div>
                            <div
                              className={`mt-1 flex flex-wrap items-center gap-1 text-[11px] ${
                                esCliente ? "text-[#A78BCC]" : "text-white/80"
                              }`}
                            >
                              <span>{esCliente ? clienteNombre : "IA / bot"}</span>
                              {cuando ? <span>· {cuando}</span> : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 space-y-4 border-t border-[#7B2FF7]/15 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#7B2FF7]/40"
                    checked={selected.iaHabilitada}
                    disabled={saving}
                    onChange={(e) => void patch(selected.id, { iaHabilitada: e.target.checked })}
                  />
                  IA habilitada en este chat
                </label>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#7C6FAE]">
                  Atención humana
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={saving || selected.atencionHumana === "ACTIVA"}
                    onClick={() => void patch(selected.id, { atencionHumana: "ACTIVA" })}
                  >
                    Necesita humano (activa)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={saving || selected.atencionHumana !== "ACTIVA"}
                    onClick={() => void patch(selected.id, { atencionHumana: "RESUELTA" })}
                  >
                    Marcar resuelta
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving || selected.atencionHumana === "NINGUNA"}
                    onClick={() => void patch(selected.id, { atencionHumana: "NINGUNA" })}
                  >
                    Quitar cola
                  </Button>
                </div>
                <p className="mt-2 text-xs text-[#7C6FAE]">
                  Con cola activa la IA no responde hasta que marques resuelta; después el próximo mensaje
                  del cliente reactiva la IA automáticamente.
                </p>
              </div>

              {msg ? <p className="text-sm text-[#A855F7]">{msg}</p> : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
