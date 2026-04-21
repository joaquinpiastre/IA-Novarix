"use client";

import { PipelineKanban, type EtapaKanban } from "./PipelineKanban";
import type { ContactoKanban } from "./ContactoCard";

type Props = {
  etapas: EtapaKanban[];
  contactos: ContactoKanban[];
  onMover: (contactoId: string, nuevaEtapaId: string) => Promise<void>;
};

export function CrmBoard({ etapas, contactos, onMover }: Props) {
  return <PipelineKanban etapas={etapas} contactos={contactos} onMover={onMover} />;
}
