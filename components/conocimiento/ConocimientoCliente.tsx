"use client";
/* NOVARIX_CONOCIMIENTO_MONOLITH_V3 — si Vercel falla con código viejo, este comentario debe verse en GitHub en este archivo */

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import type { ArchivoConocimiento } from "@prisma/client";
import {
  mensajeErrorImportacionWeb,
  mensajeExitoImportacionWeb,
  parseCatalogoDesdeWebJson,
} from "@/lib/catalogo-desde-web-client";

function esConocimientoManual(url: string) {
  return url.startsWith("manual://");
}

type ArchivoRow = ArchivoConocimiento & {
  agente: { nombre: string; id: string } | null;
};

/** Base de conocimiento: archivos, notas, import web (tipado de respuesta API en lib/catalogo-desde-web-client). */
export function ConocimientoCliente({
  archivos: initial,
  agentes,
}: {
  archivos: ArchivoRow[];
  agentes: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agenteId, setAgenteId] = useState("");
  const [tituloNota, setTituloNota] = useState("");
  const [textoNota, setTextoNota] = useState("");
  const [agenteNota, setAgenteNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [msgNota, setMsgNota] = useState("");
  const [normalizarExcelIA, setNormalizarExcelIA] = useState(false);
  const [urlWeb, setUrlWeb] = useState("");
  const [agenteWeb, setAgenteWeb] = useState("");
  const [normalizarWebIA, setNormalizarWebIA] = useState(true);
  const [importandoWeb, setImportandoWeb] = useState(false);
  const [msgWeb, setMsgWeb] = useState("");

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        if (agenteId) fd.append("agenteId", agenteId);
        const lower = file.name.toLowerCase();
        if (normalizarExcelIA && (lower.endsWith(".xlsx") || lower.endsWith(".xls"))) {
          fd.append("normalizarConIA", "1");
        }
        await fetch("/api/archivos", { method: "POST", body: fd });
      }
      setUploading(false);
      router.refresh();
    },
    [agenteId, normalizarExcelIA, router]
  );

  async function importarDesdeWeb(e: React.FormEvent) {
    e.preventDefault();
    setMsgWeb("");
    const u = urlWeb.trim();
    if (!u) {
      setMsgWeb("Pegá una URL (https://…)");
      return;
    }
    setImportandoWeb(true);
    const r = await fetch("/api/catalogo/desde-web", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: u,
        agenteId: agenteWeb || null,
        normalizarConIA: normalizarWebIA,
      }),
    });
    setImportandoWeb(false);
    const raw = await r.text();
    const data = parseCatalogoDesdeWebJson(raw);
    if (!r.ok) {
      setMsgWeb(mensajeErrorImportacionWeb(r.status, raw, data));
      return;
    }
    setUrlWeb("");
    setMsgWeb(mensajeExitoImportacionWeb(data));
    router.refresh();
  }

  async function vincular(archivoId: string, ids: string[]) {
    await fetch("/api/archivos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: archivoId, agenteIds: ids }),
    });
    router.refresh();
  }

  async function guardarNotaEscrita(e: React.FormEvent) {
    e.preventDefault();
    setMsgNota("");
    const texto = textoNota.trim();
    if (!texto) {
      setMsgNota("Escribí algo en el cuadro de texto.");
      return;
    }
    setGuardandoNota(true);
    const r = await fetch("/api/archivos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: tituloNota.trim() || undefined,
        texto,
        agenteId: agenteNota || null,
      }),
    });
    setGuardandoNota(false);
    if (!r.ok) {
      const errBody = (await r.json().catch(() => ({}))) as { error?: string };
      setMsgNota(errBody.error ?? "No se pudo guardar.");
      return;
    }
    setTituloNota("");
    setTextoNota("");
    setMsgNota("Listo, quedó guardado en la base de conocimiento.");
    router.refresh();
  }

  async function eliminarArchivo(id: string, nombre: string) {
    if (!confirm(`¿Eliminar «${nombre}» del conocimiento?`)) return;
    const r = await fetch(`/api/archivos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) router.refresh();
  }

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-white">Conocimiento escrito (orientación local)</h2>
        <p className="mb-4 text-sm leading-relaxed text-[#C4B5FD]">
          Escribí acá lo que querés que el agente tenga en cuenta: respuestas tipo si preguntan por algo
          concreto, datos que no están en archivos, tono, políticas, etc. Se guarda en tu cuenta y se usa
          junto con el resto del conocimiento al responder por WhatsApp.
        </p>
        <form onSubmit={guardarNotaEscrita} className="space-y-4">
          <Input
            label="Título (opcional)"
            placeholder="Ej.: Horarios, envíos, cómo hablar de la marca"
            value={tituloNota}
            onChange={(e) => setTituloNota(e.target.value)}
          />
          <Textarea
            label="Qué debe saber o cómo debe responder"
            placeholder={`Ej.:\n- Si preguntan por precios de envío: decir que el envío es gratis sobre $50.000.\n- Si preguntan si abrimos domingo: no, solo lun a sáb.\n- Siempre mencionar que aceptamos Mercado Pago.`}
            value={textoNota}
            onChange={(e) => setTextoNota(e.target.value)}
            className="min-h-[180px]"
          />
          <div>
            <label className="mb-1 block text-sm text-[#C4B5FD]">Vincular a un agente (opcional)</label>
            <select
              className="w-full max-w-md rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white"
              value={agenteNota}
              onChange={(e) => setAgenteNota(e.target.value)}
            >
              <option value="">Todos los agentes (conocimiento global de la empresa)</option>
              {agentes.map((a) => (
                <option key={a.id} value={a.id}>
                  Solo {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={guardandoNota}>
            {guardandoNota ? "Guardando…" : "Guardar texto en conocimiento"}
          </Button>
          {msgNota ? <p className="text-sm text-[#A855F7]">{msgNota}</p> : null}
        </form>
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-white">Catálogo desde página web</h2>
        <p className="mb-4 text-sm leading-relaxed text-[#C4B5FD]">
          Pegá la URL de una tienda o listado público. Hacemos <strong className="text-white">una sola descarga</strong>{" "}
          del HTML inicial (no abrimos un navegador): sacamos texto visible y URLs de imágenes que vengan en ese HTML
          (incluye <code className="text-[#E9D5FF]">src</code>, carga diferida tipo{" "}
          <code className="text-[#E9D5FF]">data-src</code>, <code className="text-[#E9D5FF]">srcset</code>, etc., hasta
          un tope razonable). Las imágenes que cargue JavaScript después o que estén en otras páginas{" "}
          <strong className="text-white">no</strong> entran. Si activás IA, ordenamos productos y precios en listado;
          en cada producto la IA solo puede poner una URL de imagen si la reconoce en ese material.
        </p>
        <form onSubmit={(e) => void importarDesdeWeb(e)} className="space-y-4">
          <Input
            label="URL"
            type="url"
            placeholder="https://tutienda.com/productos"
            value={urlWeb}
            onChange={(e) => setUrlWeb(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm text-[#C4B5FD]">Vincular a un agente (opcional)</label>
            <select
              className="w-full max-w-md rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white"
              value={agenteWeb}
              onChange={(e) => setAgenteWeb(e.target.value)}
            >
              <option value="">Todos los agentes</option>
              {agentes.map((a) => (
                <option key={a.id} value={a.id}>
                  Solo {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
            <input
              type="checkbox"
              checked={normalizarWebIA}
              onChange={(e) => setNormalizarWebIA(e.target.checked)}
              className="rounded border-[#7B2FF7]/40"
            />
            Normalizar catálogo con IA (recomendado si la página es ruidosa)
          </label>
          <Button type="submit" disabled={importandoWeb}>
            {importandoWeb ? "Importando…" : "Importar desde la web"}
          </Button>
          {msgWeb ? <p className="text-sm text-[#A855F7]">{msgWeb}</p> : null}
        </form>
      </Card>

      <Card>
        <p className="mb-2 text-sm text-[#C4B5FD]">Vincular nuevos archivos a un agente (opcional)</p>
        <select
          className="mb-4 w-full max-w-md rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white md:w-auto"
          value={agenteId}
          onChange={(e) => setAgenteId(e.target.value)}
        >
          <option value="">Sin agente (empresa)</option>
          {agentes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-[#C4B5FD]">
          <input
            type="checkbox"
            checked={normalizarExcelIA}
            onChange={(e) => setNormalizarExcelIA(e.target.checked)}
            className="rounded border-[#7B2FF7]/40"
          />
          Al subir Excel (.xlsx / .xls), normalizar filas en catálogo con IA
        </label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void onFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
            drag ? "border-[#A855F7] bg-[#2D0A5E]/40" : "border-[#7B2FF7]/30"
          }`}
        >
          <p className="text-[#C4B5FD]">Arrastrá Excel, PDF, CSV o TXT</p>
          <p className="mt-2 text-xs text-[#7C6FAE]">
            Los Excel se leen automáticamente y el texto queda en conocimiento (ideal para listas de
            productos).
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.csv,.txt,.xlsx,.xls"
            className="mt-4 block w-full text-sm text-[#C4B5FD] file:mr-4 file:rounded-input file:border-0 file:bg-[#7B2FF7] file:px-4 file:py-2 file:text-white"
            onChange={(e) => void onFiles(e.target.files)}
            disabled={uploading}
          />
          {uploading ? <p className="mt-2 text-sm text-[#A855F7]">Subiendo…</p> : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Archivos</h2>
        <ul className="space-y-4">
          {initial.map((f) => (
            <li
              key={f.id}
              className="flex flex-col gap-3 border-b border-[#7B2FF7]/15 pb-4 last:border-0 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{f.nombre}</p>
                  {esConocimientoManual(f.url) ? (
                    <Badge variant="pro">Texto propio</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-[#7C6FAE]">
                  {f.tipo} · {new Date(f.creadoEn).toLocaleString("es-AR")}
                </p>
                <p className="text-sm text-[#C4B5FD]">
                  Agente: {f.agente?.nombre ?? "Ninguno (global)"}
                </p>
                {(esConocimientoManual(f.url) || f.tipo === "WEB" || f.tipo === "EXCEL") && f.contenido ? (
                  <p className="mt-2 line-clamp-3 text-xs text-[#7C6FAE] whitespace-pre-wrap">{f.contenido}</p>
                ) : null}
                {f.tipo === "WEB" && f.url.startsWith("http") ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-[#A855F7] underline"
                  >
                    Abrir URL origen
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {agentes.map((a) => (
                    <Button
                      key={a.id}
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void vincular(f.id, [a.id])}
                    >
                      Vincular a {a.nombre}
                    </Button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => void eliminarArchivo(f.id, f.nombre)}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {!initial.length ? (
          <p className="text-[#7C6FAE]">Todavía no hay archivos ni texto guardado.</p>
        ) : null}
      </Card>
    </div>
  );
}
