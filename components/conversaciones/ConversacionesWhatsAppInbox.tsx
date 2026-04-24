"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AtencionHumanaEstado, CanalConversacion } from "@prisma/client";
import { ArrowLeft, Search, Send } from "lucide-react";
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

function horaLista(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isNaN(t)) return formatRelativo(iso);
  return "";
}

function horaMensaje(iso?: string): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function InboxAvatar({ label, id, size = 32 }: { label: string; id: string; size?: number }) {
  const h = hashHue(id + label);
  const ini = label.trim().slice(0, 1).toUpperCase() || "?";
  const textSize = size >= 40 ? "text-sm" : "text-xs";
  return (
    <div
      className={`mr-2 mt-1 flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-inner ${textSize}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
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
  const [mobileChat, setMobileChat] = useState(false);
  const [draftCliente, setDraftCliente] = useState("");
  const [sendingCliente, setSendingCliente] = useState(false);

  useEffect(() => {
    setDraftCliente("");
  }, [selectedId]);

  useEffect(() => {
    if (paramC && rows.some((r) => r.id === paramC)) {
      setSelectedId(paramC);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        setMobileChat(true);
      }
    }
  }, [paramC, rows]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const hiloMensajes = useMemo(() => {
    const sel = rows.find((r) => r.id === selectedId);
    return sel ? mensajesDelHilo(sel.mensajes) : [];
  }, [rows, selectedId]);

  const threadRef = useRef<HTMLDivElement>(null);
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
      setMobileChat(true);
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

  async function enviarAlCliente() {
    if (!selected || !draftCliente.trim() || sendingCliente) return;
    setSendingCliente(true);
    setMsg("");
    try {
      const r = await fetch(`/api/conversaciones/${selected.id}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: draftCliente.trim() }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setMsg(j.error ?? "No se pudo enviar");
        return;
      }
      const mapped = conversacionApiToRow(j as Record<string, unknown>);
      if (mapped) {
        setRows((prev) => {
          const i = prev.findIndex((row) => row.id === mapped.id);
          if (i === -1) return [mapped, ...prev];
          const next = [...prev];
          next[i] = mapped;
          return next.sort(
            (a, b) => (Date.parse(b.ultimoMensaje) || 0) - (Date.parse(a.ultimoMensaje) || 0)
          );
        });
      }
      setDraftCliente("");
      setMsg("Enviado al cliente.");
    } finally {
      setSendingCliente(false);
    }
  }

  return (
    <div
      className="flex h-full max-h-full w-full min-h-0 overflow-hidden rounded-2xl border border-[rgba(123,47,247,0.15)] bg-[#0A0118] shadow-[0_0_60px_rgba(123,47,247,0.08)]"
      style={{
        background:
          "linear-gradient(90deg, #0A0118 0%, #130826 18%, #0A0118 50%, #130826 82%, #0A0118 100%)",
      }}
    >
      <aside
        className={`flex min-h-0 w-full shrink-0 flex-col border-r border-[rgba(123,47,247,0.12)] bg-[#130826]/90 md:w-[30%] md:max-w-sm ${
          mobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="border-b border-[rgba(123,47,247,0.15)] px-4 py-3">
          <h1 className="text-sm font-bold text-white">Chats</h1>
          <p className="text-[11px] text-[#A78BCC]">Clientes · WhatsApp · Meta</p>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B5A8C]" />
            <input
              type="search"
              placeholder="Buscar conversación…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-[rgba(123,47,247,0.2)] bg-[#1A0A35] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#6B5A8C] focus:border-[#7B2FF7]/50"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B5A8C]">Conversaciones</p>
          {filtered.map((c) => {
            const active = c.id === selectedId;
            const requiereHumano = c.atencionHumana === "ACTIVA";
            const tRel = horaLista(c.ultimoMensaje);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className={`relative mb-1 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[#2D0A5E]/50 ${
                  requiereHumano ? "animate-pulse bg-rose-950/15" : ""
                } ${active ? "bg-[#2D0A5E]/70 ring-1 ring-[#7B2FF7]/30" : ""}`}
              >
                {requiereHumano ? (
                  <span className="absolute right-2 top-2 z-10 inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-rose-300/40" />
                ) : null}
                <InboxAvatar label={tituloChat(c)} id={c.numeroCliente || c.id} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-bold text-white">{tituloChat(c)}</span>
                    <span className="shrink-0 text-[11px] text-[#A78BCC]">{tRel}</span>
                  </div>
                  <p className="truncate text-xs text-[#A78BCC]">{previewMensajes(c.mensajes)}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded border border-[rgba(123,47,247,0.25)] bg-[#1A0A35]/80 px-1.5 py-0.5 text-[10px] text-[#C4B5FD]">
                      {etiquetaCanal(c.canal)}
                    </span>
                    {c.esGrupo ? (
                      <span className="rounded bg-[#2D0A5E]/80 px-1.5 py-0.5 text-[10px] text-[#C4B5FD]">Grupo</span>
                    ) : null}
                    {!c.iaHabilitada ? (
                      <span className="rounded bg-amber-950/60 px-1.5 py-0.5 text-[10px] text-amber-200/90">
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
            <p className="p-6 text-center text-sm text-[#A78BCC]">No hay chats que coincidan.</p>
          ) : null}
        </div>
      </aside>

      <section
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-b from-[#130826]/40 to-[#0A0118] ${
          mobileChat ? "flex" : "hidden md:flex"
        }`}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-[#A78BCC]">
            <Search className="h-12 w-12 opacity-40" />
            <p className="text-sm text-white/90">Elegí un chat de la lista.</p>
            <p className="max-w-sm text-xs">Los mensajes se actualizan en vivo mientras el chat está abierto.</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="flex shrink-0 items-center gap-3 border-b border-[rgba(123,47,247,0.12)] bg-[#1A0A35]/80 px-3 py-2 backdrop-blur-md">
              <button
                type="button"
                className="rounded-lg p-2 text-[#A78BCC] hover:bg-white/10 md:hidden"
                onClick={() => setMobileChat(false)}
                aria-label="Volver a la lista"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="md:hidden">
                <InboxAvatar label={tituloChat(selected)} id={selected.numeroCliente || selected.id} size={36} />
              </div>
              <div className="hidden md:block">
                <InboxAvatar label={tituloChat(selected)} id={selected.numeroCliente || selected.id} size={40} />
              </div>
              <div className="min-w-0 flex-1 md:pl-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[15px] font-bold text-white">{tituloChat(selected)}</h2>
                  <span className="shrink-0 rounded border border-[rgba(123,47,247,0.25)] px-2 py-0.5 text-[11px] text-[#C4B5FD]">
                    {etiquetaCanal(selected.canal)}
                  </span>
                </div>
                <p className="truncate font-mono text-[11px] text-[#A78BCC]">{selected.numeroCliente}</p>
                <p className="truncate text-[11px] text-[#A78BCC]">
                  {selected.agente?.nombre ? `Agente: ${selected.agente.nombre}` : "Sin agente asignado"}
                  {" · "}
                  Historial en vivo
                </p>
              </div>
            </header>

            {selected.atencionHumana === "ACTIVA" ? (
              <div className="shrink-0 border-b border-rose-500/20 bg-rose-950/20 px-3 py-2">
                <p className="text-xs text-rose-200">
                  Derivado a humano:{" "}
                  <strong className="text-rose-100">
                    {selected.agente?.responsableHumano?.trim() || "Asesor del sector"}
                  </strong>
                </p>
              </div>
            ) : null}

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
                  const esStaff = m.role === "staff";
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

                  if (!esCliente && !esAsistente && !esStaff) {
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
                  const bubbleEquipo = [
                    "relative px-3 py-2 shadow-lg",
                    "rounded-[18px] rounded-br-[4px] bg-gradient-to-br from-[#0D9488] to-[#0369A1] text-white shadow-teal-500/20",
                  ].join(" ");
                  const bubbleDerecha = esStaff ? bubbleEquipo : bubbleIa;

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
                          <InboxAvatar label={clienteNombre} id={selected.numeroCliente || selected.id} size={32} />
                        ) : null}
                        <div className="max-w-[min(85%,520px)]">
                          <div className={esCliente ? bubbleCliente : bubbleDerecha}>
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
                              <span>
                                {esCliente ? clienteNombre : esStaff ? "Equipo" : "IA / bot"}
                              </span>
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

            <div className="shrink-0 space-y-3 border-t border-[rgba(123,47,247,0.2)] bg-[#130826]/95 px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#7B2FF7]/40 accent-[#7B2FF7]"
                    checked={selected.iaHabilitada}
                    disabled={saving}
                    onChange={(e) => void patch(selected.id, { iaHabilitada: e.target.checked })}
                  />
                  IA habilitada en este chat
                </label>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#6B5A8C]">Atención humana</p>
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
                <p className="mt-2 text-[11px] leading-relaxed text-[#A78BCC]">
                  Con cola activa la IA no responde hasta que marques resuelta; el próximo mensaje del cliente reactiva
                  la IA. Vos podés escribir abajo igual: tu mensaje llega al cliente por WhatsApp / Meta.
                </p>
              </div>

              {msg ? (
                <p className="whitespace-pre-wrap break-words text-sm text-[#A855F7]">{msg}</p>
              ) : null}

              <div className="border-t border-[rgba(123,47,247,0.25)] pt-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#6B5A8C]">
                  Tu mensaje al cliente
                </p>
                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={draftCliente}
                    onChange={(e) => setDraftCliente(e.target.value)}
                    disabled={saving || sendingCliente}
                    placeholder="Escribí acá; el cliente lo recibe en su app (WhatsApp / Instagram / Messenger)…"
                    className="min-h-[48px] flex-1 resize-y rounded-xl border border-[rgba(123,47,247,0.35)] bg-[#1A0A35] px-3 py-2.5 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-[#6B5A8C] focus:border-[#7B2FF7]/60 focus:ring-[#7B2FF7]/20 disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void enviarAlCliente();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving || sendingCliente || !draftCliente.trim()}
                    onClick={() => void enviarAlCliente()}
                    className="shrink-0 gap-1.5"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                    {sendingCliente ? "…" : "Enviar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
