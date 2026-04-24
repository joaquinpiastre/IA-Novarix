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
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[#C026D3]/35 bg-[#C026D3]/10 px-3 py-2.5 text-xs leading-snug text-[#f0abfc] sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-lg sm:px-4 sm:py-3 sm:text-sm">
      <span className="text-[#fce7f6]/95">Estás viendo el panel como cliente.</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="w-full shrink-0 sm:w-auto"
        onClick={() => void salir()}
      >
        Volver al admin
      </Button>
    </div>
  );
}
