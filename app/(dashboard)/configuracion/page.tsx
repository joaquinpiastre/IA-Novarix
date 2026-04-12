import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ConfiguracionForm } from "@/components/configuracion/ConfiguracionForm";
import { MetaConexionCard } from "@/components/configuracion/MetaConexionCard";
import { Card } from "@/components/ui/Card";

export default function ConfiguracionPage() {
  return (
    <PageShell title="Configuración">
      <Suspense
        fallback={
          <Card className="mb-8">
            <p className="text-[#7C6FAE]">Cargando integración Meta…</p>
          </Card>
        }
      >
        <div className="mb-8">
          <MetaConexionCard />
        </div>
      </Suspense>
      <ConfiguracionForm />
    </PageShell>
  );
}
