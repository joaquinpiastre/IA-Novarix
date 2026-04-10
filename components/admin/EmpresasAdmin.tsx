"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { Plan } from "@prisma/client";

type EmpresaRow = {
  id: string;
  nombre: string;
  email: string;
  plan: Plan;
  creditosUsados: number;
  creditosIncluidos: number;
  activo: boolean;
};

export function EmpresasAdmin({ initial }: { initial: EmpresaRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState<Plan>("BASIC");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const r = await fetch("/api/admin/empresas");
    if (r.ok) setRows(await r.json());
    router.refresh();
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/admin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password, plan }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error ?? "Error");
      return;
    }
    setShowNew(false);
    setNombre("");
    setEmail("");
    setPassword("");
    setMsg("Empresa creada.");
    await refresh();
  }

  async function toggleActivo(id: string, activo: boolean) {
    await fetch(`/api/admin/empresas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !activo }),
    });
    await refresh();
  }

  async function verComoEmpresa(id: string) {
    const r = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ empresaId: id }),
    });
    if (!r.ok) {
      const text = await r.text();
      let detalle = `Error ${r.status}`;
      try {
        const j = JSON.parse(text) as { error?: string };
        if (j.error) detalle = j.error;
      } catch {
        if (text.trim()) detalle = text.trim().slice(0, 200);
      }
      setMsg(detalle);
      return;
    }
    // Navegación completa: asegura que la cookie Set-Cookie del POST viaje en la siguiente petición
    // (evita que el middleware redirija de nuevo a /admin).
    window.location.assign("/");
  }

  async function cambiarPlan(id: string, nuevo: Plan) {
    await fetch(`/api/admin/empresas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: nuevo }),
    });
    await refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Empresas</h1>
        <Button type="button" onClick={() => setShowNew(!showNew)}>
          Nueva empresa
        </Button>
      </div>

      {showNew ? (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Alta de cliente</h2>
          <form onSubmit={crear} className="grid max-w-xl gap-4">
            <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input
              label="Contraseña inicial (mín. 8)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <div>
              <label className="mb-1 block text-sm text-[#C4B5FD]">Plan</label>
              <select
                className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2 text-sm text-white"
                value={plan}
                onChange={(e) => setPlan(e.target.value as Plan)}
              >
                <option value="BASIC">Basic</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <Button type="submit">Crear cuenta</Button>
          </form>
        </Card>
      ) : null}

      {msg ? <p className="text-sm text-[#A855F7]">{msg}</p> : null}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#7B2FF7]/20 text-[#C4B5FD]">
            <tr>
              <th className="p-4">Empresa</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Créditos usados</th>
              <th className="p-4">Estado</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="text-[#C4B5FD]">
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-[#7B2FF7]/10">
                <td className="p-4">
                  <p className="font-medium text-white">{e.nombre}</p>
                  <p className="text-xs text-[#7C6FAE]">{e.email}</p>
                </td>
                <td className="p-4">
                  <select
                    className="rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-2 py-1 text-xs"
                    value={e.plan}
                    onChange={(ev) => void cambiarPlan(e.id, ev.target.value as Plan)}
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="PRO">PRO</option>
                    <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
                </td>
                <td className="p-4">
                  {e.creditosUsados.toFixed(1)} / {e.creditosIncluidos}
                </td>
                <td className="p-4">
                  <Badge variant={e.activo ? "activo" : "inactivo"}>
                    {e.activo ? "Activa" : "Suspendida"}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => void verComoEmpresa(e.id)}>
                      Ver como empresa
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void toggleActivo(e.id, e.activo)}
                    >
                      {e.activo ? "Suspender" : "Activar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
