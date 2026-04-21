"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";

type Msg = { role: string; content: string };

type Props = {
  contactoId: string;
  inicial: {
    nombre: string | null;
    numero: string;
    email: string | null;
    empresaCliente: string | null;
    etapaId: string | null;
    valorOportunidad: number | null;
    notas: string | null;
    proximoSeguimiento: string | null;
  };
  etapas: { id: string; nombre: string }[];
  conversaciones: {
    id: string;
    ultimoMensaje: Date | string;
    mensajes: unknown;
  }[];
  historialEtapas: { id: string; etapaAnterior: string | null; etapaNueva: string; cambiadoEn: Date | string }[];
  seguimientos: {
    id: string;
    mensaje: string;
    estado: string;
    enviadoEn: Date | string | null;
    creadoEn: Date | string;
    regla: { nombre: string };
  }[];
  etapaNombres: Record<string, string>;
};

export function ContactoDetalleClient({
  contactoId,
  inicial,
  etapas,
  conversaciones,
  historialEtapas,
  seguimientos,
  etapaNombres,
}: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(inicial.nombre ?? "");
  const [email, setEmail] = useState(inicial.email ?? "");
  const [empresaCliente, setEmpresaCliente] = useState(inicial.empresaCliente ?? "");
  const [etapaId, setEtapaId] = useState(inicial.etapaId ?? "");
  const [valor, setValor] = useState(inicial.valorOportunidad != null ? String(inicial.valorOportunidad) : "");
  const [proximo, setProximo] = useState(
    inicial.proximoSeguimiento ? inicial.proximoSeguimiento.slice(0, 16) : ""
  );
  const [notas, setNotas] = useState(inicial.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function guardar() {
    setSaving(true);
    await fetch(`/api/crm/contactos/${contactoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre.trim() || null,
        email: email.trim() || null,
        empresaCliente: empresaCliente.trim() || null,
        etapaId: etapaId || null,
        valorOportunidad: valor ? parseFloat(valor.replace(",", ".")) : null,
        proximoSeguimiento: proximo ? new Date(proximo).toISOString() : null,
        notas,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  async function eliminar() {
    if (
      !window.confirm(
        "¿Eliminar este contacto del CRM?\n\nLas conversaciones quedarán sin vincular. Esta acción no se puede deshacer."
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const r = await fetch(`/api/crm/contactos/${contactoId}`, { method: "DELETE" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        window.alert((j as { error?: string }).error ?? "No se pudo eliminar.");
        return;
      }
      router.push("/crm");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Datos y etapa</h2>
          <Button
            type="button"
            variant="ghost"
            className="text-rose-300 hover:bg-rose-950/40 hover:text-rose-200"
            disabled={deleting}
            onClick={() => void eliminar()}
          >
            {deleting ? "Eliminando…" : "Eliminar del CRM"}
          </Button>
        </div>
        <div>
          <label className="mb-1 block text-sm text-[#C4B5FD]">Teléfono / clave</label>
          <p className="rounded-input border border-[#7B2FF7]/20 bg-[#0A0118]/40 px-3 py-2.5 font-mono text-sm text-[#C4B5FD]">
            {inicial.numero}
          </p>
          <p className="mt-1 text-xs text-[#7C6FAE]">El identificador no se puede cambiar desde acá.</p>
        </div>
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Empresa (cliente)"
          value={empresaCliente}
          onChange={(e) => setEmpresaCliente(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm text-[#C4B5FD]">Etapa</label>
          <select
            value={etapaId}
            onChange={(e) => setEtapaId(e.target.value)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white"
          >
            <option value="">—</option>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Valor oportunidad"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm text-[#C4B5FD]">Próximo seguimiento</label>
          <input
            type="datetime-local"
            value={proximo}
            onChange={(e) => setProximo(e.target.value)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white"
          />
        </div>
        <Textarea label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        <Button type="button" disabled={saving} onClick={guardar}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </Card>

      <div className="space-y-6">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Historial de etapas</h2>
          <ul className="space-y-2 text-sm text-[#C4B5FD]">
            {historialEtapas.length ? (
              historialEtapas.map((h) => (
                <li key={h.id} className="border-b border-[#7B2FF7]/10 pb-2">
                  <span className="text-[#7C6FAE]">
                    {new Date(h.cambiadoEn).toLocaleString("es-AR")}:{" "}
                  </span>
                  {h.etapaAnterior ? etapaNombres[h.etapaAnterior] ?? h.etapaAnterior : "—"} →{" "}
                  {etapaNombres[h.etapaNueva] ?? h.etapaNueva}
                </li>
              ))
            ) : (
              <li className="text-[#7C6FAE]">Sin movimientos registrados.</li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Seguimientos automáticos</h2>
          <ul className="space-y-2 text-sm">
            {seguimientos.length ? (
              seguimientos.map((s) => (
                <li key={s.id} className="border-b border-[#7B2FF7]/10 pb-2 text-[#C4B5FD]">
                  <span className="text-white">{s.regla.nombre}</span> · {s.estado}
                  {s.enviadoEn ? ` · ${new Date(s.enviadoEn).toLocaleString("es-AR")}` : ""}
                  <p className="mt-1 line-clamp-3 text-xs text-[#7C6FAE]">{s.mensaje}</p>
                </li>
              ))
            ) : (
              <li className="text-[#7C6FAE]">Ninguno aún.</li>
            )}
          </ul>
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <h2 className="mb-4 text-lg font-semibold text-white">Conversaciones con el bot</h2>
        <div className="space-y-6">
          {conversaciones.length ? (
            conversaciones.map((conv) => {
              const msgs = (conv.mensajes as Msg[]) || [];
              const slice = msgs.slice(-12);
              return (
                <div key={conv.id} className="rounded-lg border border-[#7B2FF7]/20 bg-[#0A0118]/40 p-4">
                  <p className="mb-2 text-xs text-[#7C6FAE]">
                    Último mensaje: {new Date(conv.ultimoMensaje).toLocaleString("es-AR")}
                  </p>
                  <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
                    {slice.map((m, i) => (
                      <p
                        key={i}
                        className={m.role === "user" ? "text-[#C4B5FD]" : "text-white"}
                      >
                        <span className="text-[#7C6FAE]">{m.role === "user" ? "Cliente" : "Bot"}: </span>
                        {m.content}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-[#7C6FAE]">No hay conversaciones vinculadas.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
