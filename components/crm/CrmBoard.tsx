"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PipelineKanban, type EtapaKanban } from "./PipelineKanban";
import type { ContactoKanban } from "./ContactoCard";
import { ModalNuevoContacto } from "./ModalNuevoContacto";

type Props = {
  etapas: EtapaKanban[];
  contactos: ContactoKanban[];
};

export function CrmBoard({ etapas, contactos }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState(false);

  async function onMover(contactoId: string, nuevaEtapaId: string) {
    const r = await fetch("/api/crm/mover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactoId, nuevaEtapaId }),
    });
    if (!r.ok) throw new Error("No se pudo mover");
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => setModal(true)}>
          Nuevo contacto
        </Button>
        <Link href="/crm/configuracion">
          <Button type="button" variant="secondary">
            Configurar etapas
          </Button>
        </Link>
      </div>
      <PipelineKanban etapas={etapas} contactos={contactos} onMover={onMover} />
      <ModalNuevoContacto
        etapas={etapas}
        open={modal}
        onClose={() => setModal(false)}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
