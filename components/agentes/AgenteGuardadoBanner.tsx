"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";

export const SESSION_KEY_AGENTE_GUARDADO = "novarix_agente_guardado";

export function AgenteGuardadoBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (!sessionStorage.getItem(SESSION_KEY_AGENTE_GUARDADO)) return;
      sessionStorage.removeItem(SESSION_KEY_AGENTE_GUARDADO);
      setOpen(true);
      const t = window.setTimeout(() => setOpen(false), 4800);
      return () => window.clearTimeout(t);
    } catch {
      /* private mode / storage blocked */
    }
  }, []);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        open ? "mb-6 max-h-32 opacity-100" : "pointer-events-none mb-0 max-h-0 opacity-0"
      }`}
      aria-live="polite"
    >
      <div
        className={`
          relative flex items-center gap-3 overflow-hidden rounded-xl border border-[#7B2FF7]/45
          bg-gradient-to-r from-[#2D0A5E]/95 via-[#3d1580]/90 to-[#4A1A9E]/70
          px-4 py-3.5 pr-10 shadow-[0_0_32px_rgba(123,47,247,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]
          backdrop-blur-md
        `}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#A855F7]/20 blur-2xl"
          aria-hidden
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#7B2FF7]/25 ring-1 ring-[#A855F7]/40">
          <CheckCircle2 className="h-5 w-5 text-[#C4B5FD]" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#A855F7]" aria-hidden />
            Agente guardado
          </p>
          <p className="mt-0.5 text-xs text-[#C4B5FD]/90">Los cambios ya están aplicados.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#C4B5FD]/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
