import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PlantillasWhatsApp } from "@/components/plantillas/PlantillasWhatsApp";
import { Card } from "@/components/ui/Card";

export default function PlantillasPage() {
  return (
    <PageShell title="Plantillas">
      <Suspense
        fallback={
          <Card>
            <p className="text-[#7C6FAE]">Cargando…</p>
          </Card>
        }
      >
        <PlantillasWhatsApp />
      </Suspense>
    </PageShell>
  );
}
