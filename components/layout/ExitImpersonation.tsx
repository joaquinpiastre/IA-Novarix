"use client";

import { Button } from "@/components/ui/Button";

export function ExitImpersonation() {
  async function salir() {
    await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ empresaId: null }),
    });
    window.location.assign("/admin");
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-[#C026D3]/40 bg-[#C026D3]/10 px-4 py-3 text-sm text-[#f0abfc]">
      <span>Estás viendo el panel como cliente.</span>
      <Button type="button" size="sm" variant="secondary" onClick={() => void salir()}>
        Volver al admin
      </Button>
    </div>
  );
}
