"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type EmpresaMeta = {
  metaVinculado?: boolean;
  metaPageNombre?: string | null;
  metaInstagramUsername?: string | null;
};

type PaginaPendiente = {
  id: string;
  name: string;
  pictureUrl: string | null;
  instagramUsername: string | null;
};

export function MetaConexionCard() {
  const router = useRouter();
  const sp = useSearchParams();
  const [metaVinculado, setMetaVinculado] = useState(false);
  const [pageName, setPageName] = useState<string | null>(null);
  const [igUser, setIgUser] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [paginasPend, setPaginasPend] = useState<PaginaPendiente[]>([]);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [cargandoPend, setCargandoPend] = useState(false);
  const [guardandoPagina, setGuardandoPagina] = useState(false);

  const refrescarEmpresa = useCallback(async () => {
    const r = await fetch("/api/empresa");
    if (!r.ok) return;
    const e = (await r.json()) as EmpresaMeta;
    setMetaVinculado(!!e.metaVinculado);
    setPageName(e.metaPageNombre ?? null);
    setIgUser(e.metaInstagramUsername ?? null);
  }, []);

  useEffect(() => {
    void refrescarEmpresa();
  }, [refrescarEmpresa]);

  useEffect(() => {
    const conectado = sp.get("conectado");
    const err = sp.get("meta_error");
    const sel = sp.get("seleccionar_pagina");

    if (conectado === "true") {
      setMsg("Conectado: la IA ya puede responder en Messenger e Instagram.");
      window.alert(
        "Facebook e Instagram conectados correctamente.\n\nLa IA puede responder en Messenger e Instagram. WhatsApp Cloud API se configura aparte en «WhatsApp Business (Meta)» más abajo."
      );
      void refrescarEmpresa();
      router.replace("/configuracion", { scroll: false });
    }
    if (err) {
      setMsg(decodeURIComponent(err));
      router.replace("/configuracion", { scroll: false });
    }
    if (sel === "1") {
      setModoSeleccion(true);
      setCargandoPend(true);
      setElegidaId(null);
      void (async () => {
        const r = await fetch("/api/meta/seleccion/pendiente");
        setCargandoPend(false);
        if (!r.ok) {
          setModoSeleccion(false);
          setMsg("No hay páginas pendientes. Volvé a conectar con Facebook.");
          router.replace("/configuracion", { scroll: false });
          return;
        }
        const j = (await r.json()) as { pages: PaginaPendiente[] };
        setPaginasPend(j.pages ?? []);
        if (j.pages?.[0]) setElegidaId(j.pages[0].id);
        router.replace("/configuracion", { scroll: false });
      })();
    }
  }, [sp, router, refrescarEmpresa]);

  async function desconectar() {
    if (!window.confirm("¿Desconectar Facebook e Instagram de Novarix?")) return;
    const r = await fetch("/api/meta/desconectar", { method: "POST" });
    if (r.ok) {
      setMetaVinculado(false);
      setPageName(null);
      setIgUser(null);
      setMsg("Desconectado.");
    } else setMsg("No se pudo desconectar.");
  }

  async function confirmarPagina() {
    if (!elegidaId) return;
    setGuardandoPagina(true);
    const r = await fetch("/api/meta/seleccion/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: elegidaId }),
    });
    setGuardandoPagina(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg((j as { error?: string }).error ?? "No se pudo guardar la página.");
      return;
    }
    setModoSeleccion(false);
    setPaginasPend([]);
    setMsg("Conectado: la IA ya puede responder en Messenger e Instagram.");
    window.alert(
      "Página de Meta conectada.\n\nMessenger e Instagram quedaron vinculados. Si también usás WhatsApp Cloud API, completá Phone ID y token en «WhatsApp Business (Meta)»."
    );
    void refrescarEmpresa();
  }

  if (modoSeleccion) {
    return (
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-white">Elegí una página de Facebook</h2>
        <p className="mb-6 text-sm text-[#C4B5FD]">
          Tenés varias páginas con acceso. Seleccioná con cuál querés que respondamos en Messenger e Instagram.
        </p>
        {cargandoPend ? (
          <div className="flex items-center gap-2 text-[#C4B5FD]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando páginas…
          </div>
        ) : (
          <div className="space-y-3">
            {paginasPend.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors ${
                  elegidaId === p.id
                    ? "border-[#7B2FF7] bg-[#7B2FF7]/10"
                    : "border-[#7B2FF7]/20 bg-[#0A0118]/40 hover:border-[#7B2FF7]/40"
                }`}
              >
                <input
                  type="radio"
                  name="pagina-meta"
                  className="h-4 w-4 accent-[#7B2FF7]"
                  checked={elegidaId === p.id}
                  onChange={() => setElegidaId(p.id)}
                />
                {p.pictureUrl ? (
                  // URLs de CDN de Meta; dominios variables
                  // eslint-disable-next-line @next/next/no-img-element -- avatares externos de Graph API
                  <img src={p.pictureUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7B2FF7]/20 text-sm font-semibold text-white">
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{p.name}</p>
                  {p.instagramUsername ? (
                    <p className="text-xs text-[#9B8FC4]">@{p.instagramUsername}</p>
                  ) : null}
                </div>
              </label>
            ))}
            <Button
              type="button"
              className="mt-4 w-full sm:w-auto"
              disabled={!elegidaId || guardandoPagina}
              onClick={() => void confirmarPagina()}
            >
              {guardandoPagina ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Conectando…
                </>
              ) : (
                "Conectar esta página"
              )}
            </Button>
          </div>
        )}
        {msg ? <p className="mt-4 text-sm text-[#A855F7]">{msg}</p> : null}
      </Card>
    );
  }

  if (metaVinculado) {
    return (
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Facebook e Instagram</h2>
              <p className="mt-1 text-sm text-white">
                Página: <span className="font-medium">{pageName ?? "—"}</span>
              </p>
              {igUser ? (
                <p className="text-sm text-[#C4B5FD]">
                  Instagram: <span className="text-white">@{igUser}</span>
                </p>
              ) : (
                <p className="text-sm text-[#7C6FAE]">Sin cuenta de Instagram vinculada a esa página.</p>
              )}
              <p className="mt-2 text-sm font-medium text-emerald-400/90">Activo — respondiendo mensajes</p>
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => void desconectar()}>
            Desconectar
          </Button>
        </div>
        {msg ? <p className="mt-4 text-sm text-[#A855F7]">{msg}</p> : null}
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1877F2] to-[#E4405F] text-lg font-bold text-white shadow-lg">
          f
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Facebook e Instagram</h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#7C6FAE]">No conectado</p>
        </div>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-[#C4B5FD]">
        Conectá tu página de Facebook y la IA responderá tus mensajes de Messenger e Instagram automáticamente.
      </p>
      <a href="/api/meta/oauth/inicio" className="inline-block w-full sm:w-auto">
        <Button type="button" className="w-full bg-[#1877F2] hover:bg-[#166FE5] sm:w-auto">
          Conectar con Facebook
        </Button>
      </a>
      <ul className="mt-6 space-y-2 text-sm text-[#9B8FC4]">
        <li className="flex gap-2">
          <span className="text-emerald-400">✓</span>
          <span>No guardamos tu contraseña</span>
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-400">✓</span>
          <span>Solo accedemos a los mensajes de tu página</span>
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-400">✓</span>
          <span>Podés desconectar cuando quieras</span>
        </li>
      </ul>
      {msg ? <p className="mt-6 text-sm text-[#A855F7]">{msg}</p> : null}
    </Card>
  );
}
