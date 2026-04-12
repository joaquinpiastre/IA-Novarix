"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type EtapaOpt = { id: string; nombre: string };

export function ModalNuevoContacto({
  etapas,
  open,
  onClose,
  onCreated,
}: {
  etapas: EtapaOpt[];
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [numero, setNumero] = useState("");
  const [nombre, setNombre] = useState("");
  const [empresaCliente, setEmpresaCliente] = useState("");
  const [etapaId, setEtapaId] = useState(etapas[0]?.id ?? "");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await fetch("/api/crm/contactos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero,
        nombre: nombre || undefined,
        empresaCliente: empresaCliente || undefined,
        etapaId: etapaId || undefined,
        valorOportunidad: valor ? parseFloat(valor.replace(",", ".")) : null,
      }),
    });
    setLoading(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(typeof j.error === "string" ? j.error : "Error al crear");
      return;
    }
    setNumero("");
    setNombre("");
    setEmpresaCliente("");
    setValor("");
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <Card className="relative max-h-[90vh] w-full max-w-md overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#7C6FAE] hover:text-white"
          aria-label="Cerrar"
        >
          ✕
        </button>
        <h2 className="mb-4 text-lg font-semibold text-white">Nuevo contacto</h2>
        <form onSubmit={submit} className="space-y-4">
          <Input label="WhatsApp (número)" value={numero} onChange={(e) => setNumero(e.target.value)} required />
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Input label="Empresa" value={empresaCliente} onChange={(e) => setEmpresaCliente(e.target.value)} />
          <Input
            label="Valor oportunidad"
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm text-[#C4B5FD]">Etapa inicial</label>
            <select
              value={etapaId}
              onChange={(e) => setEtapaId(e.target.value)}
              className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white"
            >
              {etapas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Crear"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
