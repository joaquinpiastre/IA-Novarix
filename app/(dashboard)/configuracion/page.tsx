import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ConfiguracionForm } from "@/components/configuracion/ConfiguracionForm";
import { MetaConexionCard } from "@/components/configuracion/MetaConexionCard";
import { WhatsAppBusinessCard } from "@/components/configuracion/WhatsAppBusinessCard";
import { Card } from "@/components/ui/Card";

export default function ConfiguracionPage() {
  return (
    <PageShell title="Configuración">
      {/* WhatsApp Business Account Management */}
      <Suspense
        fallback={
          <Card className="mb-8">
            <p className="text-[#7C6FAE]">Cargando cuenta WhatsApp Business…</p>
          </Card>
        }
      >
        <div className="mb-8">
          <WhatsAppBusinessCard />
        </div>
      </Suspense>

      {/* Facebook / Instagram OAuth */}
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
