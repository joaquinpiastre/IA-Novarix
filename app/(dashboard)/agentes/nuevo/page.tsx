import { AgenteForm } from "@/components/agentes/AgenteForm";
import { PageShell } from "@/components/layout/PageShell";

export default function NuevoAgentePage() {
  return (
    <PageShell title="Nuevo agente">
      <AgenteForm />
    </PageShell>
  );
}
