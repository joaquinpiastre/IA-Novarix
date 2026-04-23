"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Reply,
  Smile,
  Search,
  ChevronDown,
  Check,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { MensajeriaComposer } from "./MensajeriaComposer";
import { etiquetaDia, formatRelativo, hashHue, renderRichText } from "./mensajeria-format";

const LS_CANAL = "novarix_mensajeria_canal_activo";

/** URLs de Vercel Blob (store privado) se sirven vía API con token de servidor. */
function urlBlobParaMostrar(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (url.includes("vercel-storage.com")) {
    return `/api/mensajeria/media?u=${encodeURIComponent(url)}`;
  }
  return url;
}

type CanalRow = {
  id: string;
  nombre: string;
  icono: string | null;
  tipo: string;
  ultimoMensaje: string;
  ultimoMensajeEn: string | null;
  noLeidos: number;
  tituloMostrar: string;
  online: boolean;
  otroUsuario: string | null;
};

type Msg = {
  id: string;
  usuarioId: string;
  contenido: string | null;
  tipo: string;
  archivoUrl: string | null;
  archivoNombre: string | null;
  archivoTamano: number | null;
  leidoPor: string[];
  creadoEn: string;
  editadoEn: string | null;
  eliminado: boolean;
  usuario: { id: string; nombre: string };
  replyA: {
    id: string;
    contenido: string | null;
    tipo: string;
    archivoNombre: string | null;
    eliminado: boolean;
    usuarioId: string;
    usuario: { nombre: string };
  } | null;
};

export function MensajeriaApp() {
  const [canales, setCanales] = useState<CanalRow[]>([]);
  const [yoId, setYoId] = useState<string | null>(null);
  const [yoNombre, setYoNombre] = useState("");
  const [usuariosDm, setUsuariosDm] = useState<{ id: string; nombre: string }[]>([]);
  const [canalId, setCanalId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [qLista, setQLista] = useState("");
  const [qMsg, setQMsg] = useState("");
  const [qIdx, setQIdx] = useState(0);
  const [escribiendo, setEscribiendo] = useState<{ usuarioId: string; nombre: string }[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [nuevoAbajo, setNuevoAbajo] = useState(false);
  const [cargaError, setCargaError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);
  const lastLen = useRef(0);

  const canalActivo = useMemo(() => canales.find((c) => c.id === canalId) ?? null, [canales, canalId]);

  const fetchCanales = useCallback(async () => {
    const r = await fetch("/api/mensajeria/canales");
    if (!r.ok) {
      setCargaError(
        r.status === 401 ? "Sesión expirada: volvé a iniciar sesión." : "No se pudieron cargar los canales de mensajería."
      );
      return;
    }
    setCargaError(null);
    const j = await r.json();
    setCanales(j.canales ?? []);
    setYoId(j.yo?.id ?? null);
    setYoNombre(j.yo?.nombre ?? "");
  }, []);

  const fetchUsuarios = useCallback(async () => {
    const r = await fetch("/api/mensajeria/usuarios");
    if (!r.ok) return;
    const j = await r.json();
    setUsuariosDm(j.usuarios ?? []);
  }, []);

  const fetchMensajes = useCallback(async () => {
    if (!canalId) return;
    const qs = new URLSearchParams({ canalId, take: "80" });
    if (qMsg.trim()) qs.set("q", qMsg.trim());
    const r = await fetch(`/api/mensajeria/mensajes?${qs}`);
    if (!r.ok) return;
    const j = await r.json();
    const list: Msg[] = j.mensajes ?? [];
    const prevLen = lastLen.current;
    lastLen.current = list.length;
    if (list.length > prevLen && prevLen > 0 && !stickBottom.current) setNuevoAbajo(true);
    setMensajes(list);
    if (j.yoId) setYoId(j.yoId);
  }, [canalId, qMsg]);

  const marcarLeido = useCallback(async () => {
    if (!canalId) return;
    await fetch("/api/mensajeria/leido", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canalId }),
    });
    window.dispatchEvent(new Event("novarix-mensajeria-unread"));
    void fetchCanales();
  }, [canalId, fetchCanales]);

  const fetchTyping = useCallback(async () => {
    if (!canalId) return;
    const r = await fetch(`/api/mensajeria/typing?canalId=${encodeURIComponent(canalId)}`);
    if (!r.ok) return;
    const j = await r.json();
    setEscribiendo(j.escribiendo ?? []);
  }, [canalId]);

  useEffect(() => {
    void fetchCanales();
    void fetchUsuarios();
  }, [fetchCanales, fetchUsuarios]);

  useEffect(() => {
    if (canalId) localStorage.setItem(LS_CANAL, canalId);
  }, [canalId]);

  useEffect(() => {
    if (!canales.length || canalId) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem(LS_CANAL) : null;
    const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    if (saved && canales.some((c) => c.id === saved)) {
      setCanalId(saved);
      if (mobile) setMobileChat(true);
      return;
    }
    const first = canales.find((c) => c.tipo !== "privado") ?? canales[0];
    if (first) {
      setCanalId(first.id);
      if (mobile) setMobileChat(true);
    }
  }, [canales, canalId]);

  /** Si el id guardado ya no existe en la lista (cambio de tenant, borrado, etc.), volver a un canal válido. */
  useEffect(() => {
    if (!canalId || !canales.length) return;
    const exists = canales.some((c) => c.id === canalId);
    if (exists) return;
    if (typeof window !== "undefined") localStorage.removeItem(LS_CANAL);
    const first = canales.find((c) => c.tipo !== "privado") ?? canales[0];
    if (first) {
      setCanalId(first.id);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        setMobileChat(true);
      }
    } else {
      setCanalId(null);
    }
  }, [canalId, canales]);

  useEffect(() => {
    if (!canalId) return;
    stickBottom.current = true;
    void fetchMensajes();
    void marcarLeido();
  }, [canalId, fetchMensajes, marcarLeido]);

  useEffect(() => {
    if (!canalId) return;
    const t = setInterval(() => {
      void fetchMensajes();
      void fetchTyping();
      void fetchCanales();
    }, 3000);
    return () => clearInterval(t);
  }, [canalId, fetchMensajes, fetchTyping, fetchCanales]);

  useEffect(() => {
    const h = () => void fetchCanales();
    window.addEventListener("novarix-mensajeria-unread", h);
    return () => window.removeEventListener("novarix-mensajeria-unread", h);
  }, [fetchCanales]);

  useEffect(() => {
    const t = setInterval(() => {
      void fetch("/api/mensajeria/presencia", { method: "POST" });
    }, 45000);
    void fetch("/api/mensajeria/presencia", { method: "POST" });
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      stickBottom.current = near;
      if (near) setNuevoAbajo(false);
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [canalId]);

  useEffect(() => {
    if (stickBottom.current) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const onTyping = useCallback(
    async (activo: boolean) => {
      if (!canalId) return;
      await fetch("/api/mensajeria/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canalId, activo }),
      });
    },
    [canalId]
  );

  const abrirDm = async (otroId: string) => {
    const r = await fetch("/api/mensajeria/canales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otroUsuarioId: otroId }),
    });
    const j = await r.json();
    if (!r.ok) {
      alert(j.error || "Error");
      return;
    }
    const id = j.canal?.id as string;
    setCanalId(id);
    setMobileChat(true);
    await fetchCanales();
  };

  const equipo = useMemo(() => canales.filter((c) => c.tipo !== "privado"), [canales]);
  const dms = useMemo(() => canales.filter((c) => c.tipo === "privado"), [canales]);
  const idsConDm = useMemo(
    () => new Set(dms.map((d) => d.otroUsuario).filter((x): x is string => Boolean(x))),
    [dms]
  );
  const usuariosSinDm = useMemo(() => usuariosDm.filter((u) => !idsConDm.has(u.id)), [usuariosDm, idsConDm]);

  const filtro = (c: CanalRow) =>
    !qLista.trim() ||
    c.tituloMostrar.toLowerCase().includes(qLista.toLowerCase()) ||
    c.ultimoMensaje.toLowerCase().includes(qLista.toLowerCase());

  const searchMatchIndices = useMemo(() => {
    if (!qMsg.trim()) return [];
    const needle = qMsg.toLowerCase();
    return mensajes
      .map((m, i) => (m.contenido?.toLowerCase().includes(needle) ? i : -1))
      .filter((i) => i >= 0);
  }, [mensajes, qMsg]);

  useEffect(() => {
    if (searchMatchIndices.length) {
      const mi = searchMatchIndices[qIdx % searchMatchIndices.length];
      const el = document.getElementById(`msg-${mensajes[mi]?.id}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [qIdx, searchMatchIndices, mensajes]);

  const onKeySearch = (e: React.KeyboardEvent) => {
    if (!searchMatchIndices.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setQIdx((i) => (i + 1) % searchMatchIndices.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setQIdx((i) => (i - 1 + searchMatchIndices.length) % searchMatchIndices.length);
    }
  };

  return (
    <div
      className="flex h-[calc(100dvh-6rem)] w-full min-h-0 max-h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl border border-[rgba(123,47,247,0.15)] bg-[#0A0118] shadow-[0_0_60px_rgba(123,47,247,0.08)] md:h-[calc(100vh-7rem)] md:max-h-[calc(100vh-7rem)]"
      style={{
        background:
          "linear-gradient(90deg, #0A0118 0%, #130826 18%, #0A0118 50%, #130826 82%, #0A0118 100%)",
      }}
    >
      {/* Lista */}
      <aside
        className={`flex min-h-0 w-full shrink-0 flex-col border-r border-[rgba(123,47,247,0.12)] bg-[#130826]/90 md:w-[30%] md:max-w-sm ${
          mobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        {cargaError ? (
          <div className="border-b border-red-500/30 bg-red-950/40 px-3 py-2 text-center text-xs text-red-200">{cargaError}</div>
        ) : null}
        <div className="border-b border-[rgba(123,47,247,0.15)] px-4 py-3">
          <h1 className="text-sm font-bold text-white">Mensajería</h1>
          <p className="text-[11px] text-[#A78BCC]">Equipo interno</p>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B5A8C]" />
            <input
              value={qLista}
              onChange={(e) => setQLista(e.target.value)}
              placeholder="Buscar conversación…"
              className="w-full rounded-xl border border-[rgba(123,47,247,0.2)] bg-[#1A0A35] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-[#6B5A8C] focus:border-[#7B2FF7]/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B5A8C]">Canales del equipo</p>
          {equipo.filter(filtro).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCanalId(c.id);
                setMobileChat(true);
                setReplyTo(null);
              }}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[#2D0A5E]/50 ${
                canalId === c.id ? "bg-[#2D0A5E]/70 ring-1 ring-[#7B2FF7]/30" : ""
              }`}
            >
              <span className="text-xl">{c.icono ?? "💬"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">{c.tituloMostrar}</p>
                <p className="truncate text-xs text-[#A78BCC]">{c.ultimoMensaje || "Sin mensajes"}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-[11px] text-[#A78BCC]">{formatRelativo(c.ultimoMensajeEn)}</span>
                {c.noLeidos > 0 ? (
                  <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{c.noLeidos}</span>
                ) : null}
              </div>
            </button>
          ))}

          <p className="mt-4 px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#6B5A8C]">Mensajes directos</p>
          {usuariosSinDm.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => void abrirDm(u.id)}
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[#2D0A5E]/50"
            >
              <Avatar nombre={u.nombre} id={u.id} online={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">{u.nombre}</p>
                <p className="text-xs text-[#A78BCC]">Tocá para chatear</p>
              </div>
            </button>
          ))}
          {dms.filter(filtro).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCanalId(c.id);
                setMobileChat(true);
              }}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-[#2D0A5E]/50 ${
                canalId === c.id ? "bg-[#2D0A5E]/70 ring-1 ring-[#7B2FF7]/30" : ""
              }`}
            >
              <Avatar nombre={c.tituloMostrar} id={c.id} online={c.online} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-white">{c.tituloMostrar}</p>
                <p className="truncate text-xs text-[#A78BCC]">{c.ultimoMensaje || "…"}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-[11px] text-[#A78BCC]">{formatRelativo(c.ultimoMensajeEn)}</span>
                {c.noLeidos > 0 ? (
                  <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{c.noLeidos}</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <section
        className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-b from-[#130826]/40 to-[#0A0118] ${
          mobileChat ? "flex" : "hidden md:flex"
        }`}
      >
        {canalActivo ? (
          <>
            <header className="flex items-center gap-3 border-b border-[rgba(123,47,247,0.12)] bg-[#1A0A35]/80 px-3 py-2 backdrop-blur-md">
              <button
                type="button"
                className="rounded-lg p-2 text-[#A78BCC] hover:bg-white/10 md:hidden"
                onClick={() => setMobileChat(false)}
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {canalActivo.tipo === "privado" ? (
                <Avatar nombre={canalActivo.tituloMostrar} id={canalActivo.id} online={canalActivo.online} size={40} />
              ) : (
                <span className="text-2xl">{canalActivo.icono ?? "💬"}</span>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-bold text-white">{canalActivo.tituloMostrar}</h2>
                <p className="text-[11px] text-[#A78BCC]">
                  {escribiendo.length
                    ? `${escribiendo.map((e) => e.nombre).join(", ")} está escribiendo…`
                    : `${yoNombre ? "Vos como " + yoNombre : "Equipo"} · Novarix`}
                </p>
              </div>
              <div className="relative flex items-center gap-1">
                <input
                  value={qMsg}
                  onChange={(e) => {
                    setQMsg(e.target.value);
                    setQIdx(0);
                  }}
                  onKeyDown={onKeySearch}
                  placeholder="Buscar…"
                  className="hidden w-36 rounded-lg border border-[rgba(123,47,247,0.2)] bg-[#0A0118]/80 px-2 py-1.5 text-xs text-white placeholder:text-[#6B5A8C] sm:block md:w-44"
                />
                <Search className="h-4 w-4 text-[#6B5A8C] sm:hidden" />
              </div>
            </header>

            <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4">
              {mensajes.map((m, idx) => {
                const prev = mensajes[idx - 1];
                const showDay = !prev || etiquetaDia(prev.creadoEn) !== etiquetaDia(m.creadoEn);
                const mine = m.usuarioId === yoId;
                return (
                  <div key={m.id} id={`msg-${m.id}`}>
                    {showDay ? (
                      <div className="my-4 flex items-center gap-3">
                        <div className="h-px flex-1 bg-[rgba(123,47,247,0.2)]" />
                        <span className="text-[11px] text-[#A78BCC]">{etiquetaDia(m.creadoEn)}</span>
                        <div className="h-px flex-1 bg-[rgba(123,47,247,0.2)]" />
                      </div>
                    ) : null}
                    <div className={`msg-enter group relative mb-2 flex ${mine ? "justify-end" : "justify-start"}`}>
                      {!mine ? (
                        <div className="mr-2 mt-1 shrink-0">
                          <Avatar nombre={m.usuario.nombre} id={m.usuario.id} online={false} size={32} />
                        </div>
                      ) : null}
                      <div className="max-w-[min(85%,520px)]">
                        <div
                          className={`absolute bottom-full left-0 right-0 z-10 mb-1 flex gap-1 opacity-0 transition group-hover:opacity-100 ${
                            mine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <button
                            type="button"
                            className="rounded-lg bg-[#2D0A5E] px-2 py-1 text-[11px] text-white shadow hover:bg-[#3D1A7E]"
                            onClick={() => setReplyTo(m)}
                          >
                            <Reply className="mr-1 inline h-3 w-3" />
                            Responder
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-[#2D0A5E] px-2 py-1 text-[11px] text-white shadow hover:bg-[#3D1A7E]"
                            onClick={() =>
                              window.dispatchEvent(new CustomEvent("novarix-mensajeria-quick-emoji", { detail: { emoji: "👍" } }))
                            }
                          >
                            <Smile className="mr-1 inline h-3 w-3" />
                            Reacción
                          </button>
                          {mine ? (
                            <div className="relative">
                              <button
                                type="button"
                                className="rounded-lg bg-[#2D0A5E] p-1 text-white shadow hover:bg-[#3D1A7E]"
                                onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {menuOpen === m.id ? (
                                <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] py-1 shadow-xl">
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-xs text-white hover:bg-[#2D0A5E]"
                                    onClick={async () => {
                                      const t = prompt("Editar mensaje", m.contenido ?? "");
                                      if (t && t.trim()) {
                                        await fetch(`/api/mensajeria/mensajes/${m.id}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ contenido: t.trim() }),
                                        });
                                        void fetchMensajes();
                                      }
                                      setMenuOpen(null);
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-950/40"
                                    onClick={async () => {
                                      if (!confirm("¿Eliminar mensaje?")) return;
                                      await fetch(`/api/mensajeria/mensajes/${m.id}`, { method: "DELETE" });
                                      void fetchMensajes();
                                      setMenuOpen(null);
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div
                          className={`relative px-3 py-2 shadow-lg ${
                            mine
                              ? "rounded-[18px] rounded-br-[4px] bg-gradient-to-br from-[#7B2FF7] to-[#C026D3] text-white shadow-[#7B2FF7]/25"
                              : "rounded-[18px] rounded-bl-[4px] border-l-2 border-[#7B2FF7]/40 bg-[#1E0D3A] text-white"
                          }`}
                        >
                          {m.replyA ? (
                            <div className="mb-2 rounded-lg border border-white/10 bg-black/15 px-2 py-1 text-xs">
                              <span className="font-semibold text-[#C4B5FD]">{m.replyA.usuario.nombre}</span>
                              <p className="truncate text-white/90">
                                {m.replyA.eliminado ? "Mensaje eliminado" : m.replyA.contenido ?? m.replyA.archivoNombre ?? "—"}
                              </p>
                            </div>
                          ) : null}
                          {m.tipo === "imagen" && m.archivoUrl ? (
                            <button
                              type="button"
                              onClick={() => setLightbox(urlBlobParaMostrar(m.archivoUrl) ?? m.archivoUrl)}
                              className="block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={urlBlobParaMostrar(m.archivoUrl) ?? m.archivoUrl}
                                alt=""
                                className="max-h-56 rounded-lg object-cover"
                              />
                            </button>
                          ) : null}
                          {m.tipo === "video" && m.archivoUrl ? (
                            <video
                              src={urlBlobParaMostrar(m.archivoUrl) ?? m.archivoUrl}
                              controls
                              className="max-h-64 max-w-full rounded-lg"
                              playsInline
                            />
                          ) : null}
                          {m.tipo === "audio" && m.archivoUrl ? (
                            <audio
                              src={urlBlobParaMostrar(m.archivoUrl) ?? m.archivoUrl}
                              controls
                              className="w-full min-w-[200px]"
                            />
                          ) : null}
                          {m.tipo === "archivo" && m.archivoUrl ? (
                            <a
                              href={urlBlobParaMostrar(m.archivoUrl) ?? m.archivoUrl}
                              download={m.archivoNombre ?? ""}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 text-sm underline"
                            >
                              <FileText className="h-4 w-4 shrink-0 opacity-90" />
                              {m.archivoNombre}
                            </a>
                          ) : null}
                          {m.contenido ? (
                            <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                              {renderRichText(m.contenido, qMsg.trim() ? qMsg.trim() : undefined)}
                            </p>
                          ) : null}
                          {m.eliminado ? <p className="text-sm italic opacity-70">Mensaje eliminado</p> : null}
                          <div className={`mt-1 flex items-center gap-1 text-[11px] ${mine ? "text-white/80" : "text-[#A78BCC]"}`}>
                            <span>
                              {m.usuario.nombre}
                              {mine ? " · Vos" : ""} · {formatRelativo(m.creadoEn)}
                              {m.editadoEn ? " · editado" : ""}
                            </span>
                            {mine ? <Ticks msg={m} /> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {nuevoAbajo ? (
              <button
                type="button"
                className="absolute bottom-24 right-4 flex items-center gap-1 rounded-full bg-[#7B2FF7] px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                onClick={() => {
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                  setNuevoAbajo(false);
                  stickBottom.current = true;
                }}
              >
                <ChevronDown className="h-4 w-4" /> Nuevo mensaje
              </button>
            ) : null}

            {lightbox ? (
              <button
                type="button"
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                onClick={() => setLightbox(null)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
              </button>
            ) : null}

            <MensajeriaComposer
              canalId={canalId}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
              onAfterSend={() => void fetchMensajes()}
              onTyping={onTyping}
            />
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-[#A78BCC]">
            <ImageIcon className="h-12 w-12 opacity-40" />
            <p className="text-sm text-white/90">Elegí un canal o un compañero para empezar a chatear.</p>
            {cargaError ? <p className="max-w-sm text-xs text-red-300">{cargaError}</p> : null}
            {!cargaError && !canales.length ? (
              <p className="max-w-sm text-xs text-[#A78BCC]">
                Si ves la lista vacía, ejecutá la migración de base (`add_mensajeria_interna`) y recargá la página.
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function Ticks({ msg }: { msg: Msg }) {
  const leido = msg.leidoPor.some((id) => id !== msg.usuarioId);
  const color = leido ? "text-[#C4B5FD]" : "text-white/45";
  return (
    <span className={`inline-flex pl-0.5 ${color}`} title={leido ? "Leído" : "Entregado"}>
      <Check className="h-3.5 w-3.5" />
      <Check className="-ml-1.5 h-3.5 w-3.5" />
    </span>
  );
}

function Avatar({ nombre, id, online, size = 40 }: { nombre: string; id: string; online: boolean; size?: number }) {
  const h = hashHue(id + nombre);
  const style = {
    width: size,
    height: size,
    background: `linear-gradient(135deg, hsl(${h},70%,42%), hsl(${(h + 60) % 360},65%,35%))`,
  };
  const ini = nombre.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="flex items-center justify-center rounded-full text-white shadow-inner" style={style}>
        <span className="text-sm font-bold">{ini}</span>
      </div>
      {online ? (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-[#130826] bg-[#22C55E]"
          style={{ width: 10, height: 10 }}
        />
      ) : null}
    </div>
  );
}

