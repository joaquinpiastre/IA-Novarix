"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import { Paperclip, Mic, Smile, Send, X, FileText, Image as ImageIcon, Video, Trash2 } from "lucide-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react").then((m) => m.default), { ssr: false });

type Reply = {
  id: string;
  contenido: string | null;
  usuario?: { nombre?: string };
};

type Pending = {
  url: string;
  nombre: string;
  tamano: number;
  tipo: "imagen" | "video" | "audio" | "archivo";
  caption: string;
  previewImage?: string;
};

type Props = {
  canalId: string | null;
  replyTo: Reply | null;
  onClearReply: () => void;
  onAfterSend: () => void;
  onTyping: (activo: boolean) => void;
};

export function MensajeriaComposer({ canalId, replyTo, onClearReply, onAfterSend, onTyping }: Props) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [recordCancel, setRecordCancel] = useState(false);
  const recordCancelRef = useRef(false);
  const [audioPreview, setAudioPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  const typingTRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushTyping = useCallback(() => {
    if (typingTRef.current) clearTimeout(typingTRef.current);
    typingTRef.current = setTimeout(() => onTyping(false), 1200);
  }, [onTyping]);

  useEffect(() => {
    if (!text.trim()) onTyping(false);
    else {
      onTyping(true);
      flushTyping();
    }
  }, [text, onTyping, flushTyping]);

  useEffect(() => {
    const fn = (e: Event) => {
      const em = (e as CustomEvent<{ emoji?: string }>).detail?.emoji;
      if (em) setText((t) => t + em);
    };
    window.addEventListener("novarix-mensajeria-quick-emoji", fn);
    return () => window.removeEventListener("novarix-mensajeria-quick-emoji", fn);
  }, []);

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const r = await fetch("/api/mensajeria/upload", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Error al subir");
    return j as { url: string; nombre: string; tamano: number; contentType: string };
  };

  const classify = (ct: string): Pending["tipo"] => {
    if (ct.startsWith("image/")) return "imagen";
    if (ct.startsWith("video/")) return "video";
    if (ct.startsWith("audio/")) return "audio";
    return "archivo";
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setAttachOpen(false);
    try {
      const up = await upload(f);
      const tipo = classify(up.contentType);
      let previewImage: string | undefined;
      if (tipo === "imagen") previewImage = up.url;
      if (tipo === "video") {
        previewImage = await videoPoster(up.url);
      }
      setPending({
        url: up.url,
        nombre: up.nombre,
        tamano: up.tamano,
        tipo,
        caption: "",
        previewImage,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo subir el archivo");
    }
  };

  const sendPayload = async (body: Record<string, unknown>) => {
    if (!canalId) return;
    setSending(true);
    try {
      const r = await fetch("/api/mensajeria/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canalId, ...body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Error al enviar");
      setText("");
      setPending(null);
      setAudioPreview(null);
      onClearReply();
      onAfterSend();
      window.dispatchEvent(new Event("novarix-mensajeria-unread"));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (!canalId || sending) return;
    if (pending) {
      await sendPayload({
        tipo: pending.tipo,
        archivoUrl: pending.url,
        archivoNombre: pending.nombre,
        archivoTamano: pending.tamano,
        contenido: pending.caption.trim() || null,
        replyAId: replyTo?.id ?? undefined,
      });
      return;
    }
    const t = text.trim();
    if (!t) return;
    await sendPayload({
      tipo: "texto",
      contenido: t,
      replyAId: replyTo?.id ?? undefined,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const stopMic = () => {
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
  };

  const startMic = async () => {
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
      alert("No se pudo acceder al micrófono.");
    }
  };

  const confirmAudioSend = async () => {
    if (!audioPreview || !canalId) return;
    try {
      const file = new File([audioPreview.blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
      const up = await upload(file);
      await sendPayload({
        tipo: "audio",
        archivoUrl: up.url,
        archivoNombre: file.name,
        archivoTamano: file.size,
        contenido: null,
        replyAId: replyTo?.id ?? undefined,
      });
      URL.revokeObjectURL(audioPreview.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <div className="shrink-0 border-t border-[rgba(123,47,247,0.2)] bg-[#130826]/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {replyTo ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] px-3 py-2 text-sm">
          <div className="min-w-0 border-l-2 border-[#7B2FF7] pl-2">
            <p className="text-xs font-semibold text-[#A78BCC]">Respondiendo a {replyTo.usuario?.nombre ?? "Mensaje"}</p>
            <p className="truncate text-[#E8DDFB]">{replyTo.contenido ?? "—"}</p>
          </div>
          <button type="button" onClick={onClearReply} className="shrink-0 rounded-lg p-1 text-[#A78BCC] hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {pending ? (
        <div className="mb-2 flex flex-wrap items-end gap-3 rounded-2xl border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] p-3">
          {pending.tipo === "imagen" && pending.previewImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview blob/URL externa
            <img src={pending.previewImage} alt="" className="h-24 w-24 rounded-lg object-cover" />
          ) : pending.tipo === "video" && pending.previewImage ? (
            <video src={pending.url} className="h-24 w-40 rounded-lg object-cover" muted playsInline />
          ) : (
            <div className="flex items-center gap-2 text-[#A78BCC]">
              <FileText className="h-8 w-8 text-[#7B2FF7]" />
              <div>
                <p className="text-sm font-medium text-white">{pending.nombre}</p>
                <p className="text-xs">{(pending.tamano / 1024).toFixed(0)} KB</p>
              </div>
            </div>
          )}
          <div className="min-w-[160px] flex-1">
            <input
              value={pending.caption}
              onChange={(e) => setPending({ ...pending, caption: e.target.value })}
              placeholder="Agregar leyenda…"
              className="w-full rounded-xl border border-[rgba(123,47,247,0.2)] bg-[#0A0118]/80 px-3 py-2 text-sm text-white placeholder:text-[#6B5A8C]"
            />
          </div>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="rounded-full p-2 text-[#A78BCC] hover:bg-white/10 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {audioPreview ? (
        <div className="mb-2 flex items-center gap-3 rounded-2xl border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] p-3">
          <audio src={audioPreview.url} controls className="h-9 flex-1" />
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(audioPreview.url);
              setAudioPreview(null);
            }}
            className="rounded-full p-2 text-[#A78BCC] hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void confirmAudioSend()}
            disabled={sending}
            className="rounded-full bg-gradient-to-br from-[#7B2FF7] to-[#C026D3] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#7B2FF7]/25 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      ) : null}

      {recording ? (
        <div className="mb-2 flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-950/30 px-3 py-2">
          <div className="flex flex-1 gap-0.5">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-[#7B2FF7] animate-pulse"
                style={{ height: `${8 + ((i * 17 + recordMs * 3) % 24)}px`, animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
          <span className="font-mono text-sm text-white">{fmtDur(recordMs)}</span>
          <span className="text-xs text-red-300">{recordCancel ? "Soltá para cancelar" : "Deslizá para cancelar"}</span>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => void onPickFile(e)} />
        <div className="relative">
          <button
            type="button"
            onClick={() => setAttachOpen((v) => !v)}
            className="rounded-full p-2.5 text-[#A78BCC] transition hover:bg-[#2D0A5E]/80 hover:text-white"
            aria-label="Adjuntar"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          {attachOpen ? (
            <div className="absolute bottom-12 left-0 z-20 w-44 overflow-hidden rounded-xl border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] py-1 shadow-xl">
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
                    fileRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
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
        </div>

        <button
          type="button"
          className="rounded-full p-2.5 text-[#A78BCC] transition hover:bg-[#2D0A5E]/80 hover:text-white"
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
          <Mic className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            className="rounded-full p-2.5 text-[#A78BCC] transition hover:bg-[#2D0A5E]/80 hover:text-white"
            aria-label="Emojis"
          >
            <Smile className="h-5 w-5" />
          </button>
          {emojiOpen ? (
            <div className="absolute bottom-12 left-0 z-30 shadow-2xl">
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={(e) => {
                  setText((t) => t + e.emoji);
                  setEmojiOpen(false);
                  taRef.current?.focus();
                }}
                width={320}
                height={400}
                searchPlaceholder="Buscar emoji…"
                previewConfig={{ showPreview: false }}
              />
            </div>
          ) : null}
        </div>

        <div className="relative min-h-[48px] flex-1 rounded-[30px] border border-[rgba(123,47,247,0.25)] bg-[#1A0A35] px-4 py-2 shadow-inner">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={!canalId || !!pending || !!audioPreview}
            placeholder="Escribí un mensaje…"
            rows={1}
            className="max-h-32 min-h-[28px] w-full resize-none bg-transparent text-[14px] text-white outline-none placeholder:text-[#6B5A8C] disabled:opacity-50"
            style={{ fontFamily: "inherit" }}
          />
        </div>

        {(text.trim() || pending || audioPreview) && !recording ? (
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !canalId}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7B2FF7] to-[#C026D3] text-white shadow-lg shadow-[#7B2FF7]/30 transition hover:brightness-110 disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="h-5 w-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function videoPoster(url: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.src = url;
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.onloadeddata = () => {
      try {
        v.currentTime = 0.1;
      } catch {
        resolve(undefined);
      }
    };
    v.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        c.width = v.videoWidth || 320;
        c.height = v.videoHeight || 180;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(undefined);
        ctx.drawImage(v, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.7));
      } catch {
        resolve(undefined);
      }
    };
    v.onerror = () => resolve(undefined);
  });
}
