"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import type { AtencionHumanaEstado, CanalConversacion } from "@prisma/client";
import { Theme } from "emoji-picker-react";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Search,
  Send,
  Smile,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { etiquetaDia, formatRelativo, hashHue, renderRichText } from "@/components/mensajeria/mensajeria-format";

const EmojiPicker = dynamic(() => import("emoji-picker-react").then((m) => m.default), { ssr: false });

type ThreadMsg = {
  role: string;
  content: string;
  timestamp?: string;
  tipo?: string;
  editedAt?: string;
  mediaUrl?: string;
  archivoNombre?: string;
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
      const editedAt = typeof o.editedAt === "string" ? o.editedAt : undefined;
      const mediaUrl = typeof o.mediaUrl === "string" ? o.mediaUrl : undefined;
      const archivoNombre = typeof o.archivoNombre === "string" ? o.archivoNombre : undefined;
      return { role, content, timestamp, tipo, editedAt, mediaUrl, archivoNombre };
    })
    .filter((m) => m.role && (m.content.trim() || m.mediaUrl?.trim() || (m.tipo && m.tipo !== "text")));
}

function etiquetaTipo(t?: string): string | null {
  if (!t || t === "text") return null;
  if (t === "audio") return "Audio";
  if (t === "image") return "Imagen";
  if (t === "video") return "Video";
  if (t === "document") return "Documento";
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
  const [aliasCliente, setAliasCliente] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [updatingMessage, setUpdatingMessage] = useState(false);

  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  type PendingAdjunto = {
    file: File;
    previewUrl?: string;
    caption: string;
  };
  const [pendingAdjunto, setPendingAdjunto] = useState<PendingAdjunto | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [recordCancel, setRecordCancel] = useState(false);
  const [audioPreview, setAudioPreview] = useState<{ url: string; blob: Blob } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const taClienteRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const recordCancelRef = useRef(false);
  const composerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftCliente("");
    setAliasCliente("");
    setEditingIndex(null);
    setEditingText("");
    setPendingAdjunto(null);
    setAudioPreview(null);
    setAttachOpen(false);
    setEmojiOpen(false);
    setRecording(false);
    setRecordMs(0);
  }, [selectedId]);

  useEffect(() => {
    if (!attachOpen && !emojiOpen) return;
    const close = (e: MouseEvent) => {
      const el = composerWrapRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setAttachOpen(false);
        setEmojiOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [attachOpen, emojiOpen]);

  useEffect(() => {
    if (paramC && rows.some((r) => r.id === paramC)) {
      setSelectedId(paramC);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        setMobileChat(true);
      }
    }
  }, [paramC, rows]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  useEffect(() => {
    setAliasCliente(selected?.nombreCliente?.trim() || "");
  }, [selected?.id, selected?.nombreCliente]);

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
    if (!selected || !draftCliente.trim() || sendingCliente || pendingAdjunto || audioPreview || recording) {
      return;
    }
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

  async function editarMensaje(index: number) {
    if (!selected || updatingMessage) return;
    const texto = editingText.trim();
    if (!texto) {
      setMsg("El mensaje no puede quedar vacío.");
      return;
    }
    setUpdatingMessage(true);
    setMsg("");
    try {
      const r = await fetch(`/api/conversaciones/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accionMensaje: "editar",
          mensajeIndex: index,
          mensajeTexto: texto,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
      if (!r.ok) {
        setMsg(j.error ?? "No se pudo editar el mensaje");
        return;
      }
      const mapped = conversacionApiToRow(j);
      if (mapped) {
        setRows((prev) => prev.map((row) => (row.id === mapped.id ? mapped : row)));
      }
      setEditingIndex(null);
      setEditingText("");
      setMsg("Mensaje editado.");
    } finally {
      setUpdatingMessage(false);
    }
  }

  async function eliminarMensaje(index: number) {
    if (!selected || updatingMessage) return;
    if (typeof window !== "undefined" && !window.confirm("¿Eliminar este mensaje del historial?")) return;
    setUpdatingMessage(true);
    setMsg("");
    try {
      const r = await fetch(`/api/conversaciones/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accionMensaje: "eliminar",
          mensajeIndex: index,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
      if (!r.ok) {
        setMsg(j.error ?? "No se pudo eliminar el mensaje");
        return;
      }
      const mapped = conversacionApiToRow(j);
      if (mapped) {
        setRows((prev) => prev.map((row) => (row.id === mapped.id ? mapped : row)));
      }
      setEditingIndex(null);
      setEditingText("");
      setMsg("Mensaje eliminado.");
    } finally {
      setUpdatingMessage(false);
    }
  }

  function limpiarAdjuntoPreview(p: PendingAdjunto | null) {
    if (p?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
  }

  async function postEnviarMediaApi(fd: FormData): Promise<boolean> {
    if (!selected) return false;
    const r = await fetch(`/api/conversaciones/${selected.id}/enviar-media`, { method: "POST", body: fd });
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
    if (!r.ok) {
      setMsg(j.error ?? "No se pudo enviar el archivo");
      return false;
    }
    const mapped = conversacionApiToRow(j);
    if (mapped) {
      setRows((prev) => {
        const i = prev.findIndex((row) => row.id === mapped.id);
        if (i === -1) return [mapped, ...prev];
        const next = [...prev];
        next[i] = mapped;
        return next.sort((a, b) => (Date.parse(b.ultimoMensaje) || 0) - (Date.parse(a.ultimoMensaje) || 0));
      });
    }
    return true;
  }

  async function enviarAdjuntoAlCliente() {
    if (!selected || !pendingAdjunto || sendingCliente) return;
    setSendingCliente(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.set("file", pendingAdjunto.file);
      if (pendingAdjunto.caption.trim()) fd.set("caption", pendingAdjunto.caption.trim());
      const ok = await postEnviarMediaApi(fd);
      if (ok) {
        limpiarAdjuntoPreview(pendingAdjunto);
        setPendingAdjunto(null);
        setMsg("Adjunto enviado.");
      }
    } finally {
      setSendingCliente(false);
    }
  }

  async function confirmarAudioCliente() {
    if (!selected || !audioPreview || sendingCliente) return;
    const file = new File([audioPreview.blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
    URL.revokeObjectURL(audioPreview.url);
    setAudioPreview(null);
    setSendingCliente(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const ok = await postEnviarMediaApi(fd);
      if (ok) setMsg("Audio enviado.");
    } finally {
      setSendingCliente(false);
    }
  }

  function stopMic() {
    if (recRef.current && recRef.current.state !== "inactive") {
      try {
        recRef.current.stop();
      } catch {
        /* noop */
      }
    }
    recRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRecording(false);
    setRecordMs(0);
    setRecordCancel(false);
    recordCancelRef.current = false;
  }

  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordCancelRef.current) {
          recordCancelRef.current = false;
          setRecordCancel(false);
          chunksRef.current = [];
          return;
        }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        setAudioPreview({ url, blob });
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setRecordMs(0);
      timerRef.current = setInterval(() => setRecordMs((n) => n + 1), 1000);
    } catch {
      setMsg("No se pudo acceder al micrófono.");
    }
  }

  async function onPickAdjunto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setAttachOpen(false);
    let previewUrl: string | undefined;
    if (f.type.startsWith("image/") || f.type.startsWith("video/")) {
      previewUrl = URL.createObjectURL(f);
    }
    setPendingAdjunto({ file: f, previewUrl, caption: "" });
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
            <header className="flex shrink-0 flex-col gap-2 border-b border-[rgba(123,47,247,0.12)] bg-[#1A0A35]/80 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-3">
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
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-[rgba(123,47,247,0.2)] pt-2">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(123,47,247,0.28)] bg-[#14072B] px-2 py-1">
                  <input
                    type="text"
                    value={aliasCliente}
                    onChange={(e) => setAliasCliente(e.target.value)}
                    placeholder="Apodo del chat"
                    className="h-7 w-36 rounded border border-[rgba(123,47,247,0.25)] bg-[#0A0118]/80 px-2 text-[12px] text-white placeholder:text-[#6B5A8C] outline-none focus:border-[#7B2FF7]/60"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving || aliasCliente.trim() === (selected.nombreCliente?.trim() || "")}
                    onClick={() => void patch(selected.id, { nombreCliente: aliasCliente.trim() || null })}
                  >
                    Guardar apodo
                  </Button>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(123,47,247,0.28)] bg-[#14072B] px-2 py-1 text-[12px] text-[#C4B5FD]">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-[#7B2FF7]/40 accent-[#7B2FF7]"
                    checked={selected.iaHabilitada}
                    disabled={saving}
                    onChange={(e) => void patch(selected.id, { iaHabilitada: e.target.checked })}
                  />
                  IA habilitada
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={saving || selected.atencionHumana === "ACTIVA"}
                  onClick={() => void patch(selected.id, { atencionHumana: "ACTIVA" })}
                >
                  Necesita humano
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={saving || selected.atencionHumana !== "ACTIVA"}
                  onClick={() => void patch(selected.id, { atencionHumana: "RESUELTA" })}
                >
                  Resuelta
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
                  const isEditing = editingIndex === i;
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
                        <div className={`max-w-[min(85%,520px)] ${isEditing ? "min-w-[min(85%,360px)]" : ""}`}>
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
                            {!isEditing && m.mediaUrl?.trim() ? (
                              <div className="mb-2">
                                {m.tipo === "image" ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- URL pública del adjunto
                                  <img
                                    src={m.mediaUrl}
                                    alt=""
                                    className="max-h-60 w-full rounded-lg object-cover"
                                  />
                                ) : null}
                                {m.tipo === "video" ? (
                                  <video src={m.mediaUrl} controls className="max-h-60 w-full rounded-lg" />
                                ) : null}
                                {m.tipo === "audio" ? <audio src={m.mediaUrl} controls className="w-full" /> : null}
                                {m.tipo === "document" ? (
                                  <a
                                    href={m.mediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex break-all text-sm text-white/95 underline"
                                  >
                                    📎 {m.archivoNombre?.trim() || "Descargar archivo"}
                                  </a>
                                ) : null}
                              </div>
                            ) : null}
                            {isEditing ? (
                              <div className="space-y-2 min-h-[140px]">
                                <textarea
                                  rows={4}
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  disabled={updatingMessage}
                                  className="min-h-[96px] w-full resize-y rounded-lg border border-white/20 bg-black/20 px-2.5 py-2 text-[14px] text-white outline-none placeholder:text-white/60 focus:border-white/45"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={updatingMessage}
                                    onClick={() => {
                                      setEditingIndex(null);
                                      setEditingText("");
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={updatingMessage || !editingText.trim()}
                                    onClick={() => void editarMensaje(i)}
                                  >
                                    Guardar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                                {m.content.trim() ? renderRichText(m.content.trim()) : m.mediaUrl?.trim() ? "" : "—"}
                              </div>
                            )}
                            <div
                              className={`mt-1 flex flex-wrap items-center gap-1 text-[11px] ${
                                esCliente ? "text-[#A78BCC]" : "text-white/80"
                              }`}
                            >
                              <span>
                                {esCliente ? clienteNombre : esStaff ? "Equipo" : "IA / bot"}
                              </span>
                              {cuando ? <span>· {cuando}</span> : null}
                              {m.editedAt ? <span>· editado</span> : null}
                            </div>
                          </div>
                          {!isEditing ? (
                            <div className={`mt-1 flex items-center gap-2 text-[11px] ${esCliente ? "justify-start" : "justify-end"}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingIndex(i);
                                  setEditingText(m.content);
                                }}
                                disabled={updatingMessage}
                                className="text-[#A78BCC] transition hover:text-white disabled:opacity-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void eliminarMensaje(i)}
                                disabled={updatingMessage}
                                className="text-rose-300 transition hover:text-rose-100 disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-[rgba(123,47,247,0.2)] bg-[#130826]/95 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {msg ? (
                <p className="whitespace-pre-wrap break-words text-sm text-[#A855F7]">{msg}</p>
              ) : null}

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => void onPickAdjunto(e)}
              />

              {pendingAdjunto ? (
                <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] p-3">
                  {pendingAdjunto.file.type.startsWith("image/") && pendingAdjunto.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingAdjunto.previewUrl}
                      alt=""
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : pendingAdjunto.file.type.startsWith("video/") && pendingAdjunto.previewUrl ? (
                    <video src={pendingAdjunto.previewUrl} className="h-24 w-40 rounded-lg object-cover" muted playsInline />
                  ) : (
                    <div className="flex items-center gap-2 text-[#A78BCC]">
                      <FileText className="h-8 w-8 text-[#7B2FF7]" />
                      <div>
                        <p className="text-sm font-medium text-white">{pendingAdjunto.file.name}</p>
                        <p className="text-xs">{(pendingAdjunto.file.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  )}
                  <div className="min-w-[160px] flex-1">
                    <input
                      value={pendingAdjunto.caption}
                      onChange={(e) =>
                        setPendingAdjunto((p) => (p ? { ...p, caption: e.target.value } : null))
                      }
                      placeholder="Leyenda (opcional)…"
                      className="w-full rounded-xl border border-[rgba(123,47,247,0.2)] bg-[#0A0118]/80 px-3 py-2 text-sm text-white placeholder:text-[#6B5A8C]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      limpiarAdjuntoPreview(pendingAdjunto);
                      setPendingAdjunto(null);
                    }}
                    className="rounded-full p-2 text-[#A78BCC] hover:bg-white/10 hover:text-white"
                    aria-label="Quitar adjunto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Button type="button" size="sm" disabled={sendingCliente} onClick={() => void enviarAdjuntoAlCliente()}>
                    {sendingCliente ? "…" : "Enviar adjunto"}
                  </Button>
                </div>
              ) : null}

              {audioPreview ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] p-3">
                  <audio src={audioPreview.url} controls className="h-9 flex-1" />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(audioPreview.url);
                      setAudioPreview(null);
                    }}
                    className="rounded-full p-2 text-[#A78BCC] hover:bg-white/10"
                    aria-label="Descartar audio"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Button type="button" size="sm" disabled={sendingCliente} onClick={() => void confirmarAudioCliente()}>
                    {sendingCliente ? "…" : "Enviar audio"}
                  </Button>
                </div>
              ) : null}

              {recording ? (
                <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-950/30 px-3 py-2">
                  <div className="flex flex-1 gap-0.5">
                    {Array.from({ length: 24 }).map((_, idx) => (
                      <span
                        key={idx}
                        className="w-1 animate-pulse rounded-full bg-[#7B2FF7]"
                        style={{
                          height: `${8 + ((idx * 17 + recordMs * 3) % 24)}px`,
                          animationDelay: `${idx * 40}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-sm text-white">{fmtDur(recordMs)}</span>
                  <span className="text-xs text-red-300">{recordCancel ? "Soltá para cancelar" : "Deslizá para cancelar"}</span>
                </div>
              ) : null}

              <div ref={composerWrapRef} className="rounded-2xl border border-[rgba(123,47,247,0.2)] bg-[#100424] px-2.5 py-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center gap-1 text-[#A78BCC]">
                    <button
                      type="button"
                      disabled={saving || sendingCliente || !!pendingAdjunto || !!audioPreview || recording}
                      onClick={() => setAttachOpen((v) => !v)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 hover:text-white disabled:opacity-40"
                      title="Adjuntar"
                      aria-label="Adjuntar archivo"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    {attachOpen ? (
                      <div className="absolute bottom-10 left-0 z-20 w-44 overflow-hidden rounded-xl border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] py-1 shadow-xl">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-[#2D0A5E]/60"
                          onClick={() => {
                            setAttachOpen(false);
                            if (fileRef.current) {
                              fileRef.current.accept = "image/*";
                              fileRef.current.click();
                            }
                          }}
                        >
                          <ImageIcon className="h-4 w-4" /> Imagen
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-[#2D0A5E]/60"
                          onClick={() => {
                            setAttachOpen(false);
                            if (fileRef.current) {
                              fileRef.current.accept =
                                ".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                              fileRef.current.click();
                            }
                          }}
                        >
                          <FileText className="h-4 w-4" /> Documento
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-[#2D0A5E]/60"
                          onClick={() => {
                            setAttachOpen(false);
                            if (fileRef.current) {
                              fileRef.current.accept = "video/*";
                              fileRef.current.click();
                            }
                          }}
                        >
                          <Video className="h-4 w-4" /> Video
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving || sendingCliente || !!pendingAdjunto || !!audioPreview || recording}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 hover:text-white disabled:opacity-40"
                      title="Grabar audio"
                      aria-label="Grabar audio"
                      onPointerDown={(e) => {
                        pressRef.current = { x: e.clientX, y: e.clientY };
                        void startMic();
                      }}
                      onPointerMove={(e) => {
                        if (!recording || !pressRef.current) return;
                        const dy = pressRef.current.y - e.clientY;
                        const dx = Math.abs(pressRef.current.x - e.clientX);
                        const cancel = dy > 48 || dx > 80;
                        recordCancelRef.current = cancel;
                        setRecordCancel(cancel);
                      }}
                      onPointerUp={() => {
                        if (!recording) return;
                        stopMic();
                      }}
                      onPointerLeave={() => {
                        if (recording) stopMic();
                      }}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={saving || sendingCliente || !!pendingAdjunto || !!audioPreview || recording}
                        onClick={() => setEmojiOpen((v) => !v)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 hover:text-white disabled:opacity-40"
                        title="Emojis"
                        aria-label="Emojis"
                      >
                        <Smile className="h-4 w-4" />
                      </button>
                      {emojiOpen ? (
                        <div className="absolute bottom-10 left-0 z-30 shadow-2xl">
                          <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={(ev) => {
                              setDraftCliente((t) => t + ev.emoji);
                              setEmojiOpen(false);
                              taClienteRef.current?.focus();
                            }}
                            width={300}
                            height={380}
                            searchPlaceholder="Buscar emoji…"
                            previewConfig={{ showPreview: false }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <textarea
                    ref={taClienteRef}
                    rows={1}
                    value={draftCliente}
                    onChange={(e) => setDraftCliente(e.target.value)}
                    disabled={saving || sendingCliente || !!pendingAdjunto || !!audioPreview || recording}
                    placeholder="Escribí un mensaje..."
                    className="max-h-28 min-h-[38px] flex-1 resize-none rounded-full border border-[rgba(123,47,247,0.25)] bg-[#1A0A35]/80 px-4 py-2.5 text-sm text-white outline-none ring-1 ring-transparent placeholder:text-[#6B5A8C] focus:border-[#7B2FF7]/60 focus:ring-[#7B2FF7]/20 disabled:opacity-50"
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
                    disabled={
                      saving ||
                      sendingCliente ||
                      !!pendingAdjunto ||
                      !!audioPreview ||
                      recording ||
                      !draftCliente.trim()
                    }
                    onClick={() => void enviarAlCliente()}
                    className="h-9 w-9 shrink-0 rounded-full p-0"
                    aria-label="Enviar mensaje"
                  >
                    <Send className="h-4 w-4" aria-hidden />
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

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
