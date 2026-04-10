import { PageShell } from "@/components/layout/PageShell";
import { ConfiguracionForm } from "@/components/configuracion/ConfiguracionForm";

export default function ConfiguracionPage() {
  return (
    <PageShell title="Configuración">
      <ConfiguracionForm />
    </PageShell>
  );
}
