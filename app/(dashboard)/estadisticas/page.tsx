import { PageShell } from "@/components/layout/PageShell";
import { EstadisticasClient } from "@/components/estadisticas/EstadisticasClient";

export default function EstadisticasPage() {
  return (
    <PageShell title="Estadísticas y embudo">
      <EstadisticasClient />
    </PageShell>
  );
}
