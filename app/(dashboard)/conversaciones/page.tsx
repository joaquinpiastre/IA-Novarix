import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import { PageShell } from "@/components/layout/PageShell";
import {
  ConversacionesWhatsAppInbox,
  type InboxRow,
} from "@/components/conversaciones/ConversacionesWhatsAppInbox";

export default async function ConversacionesPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);
  if (!empresaId) return null;

  const lista = await prisma.conversacion.findMany({
    where: { empresaId },
    orderBy: { ultimoMensaje: "desc" },
    take: 500,
    include: { agente: { select: { nombre: true } } },
  });

  const initial: InboxRow[] = lista.map((c) => ({
    id: c.id,
    canal: c.canal,
    numeroCliente: c.numeroCliente,
    nombreCliente: c.nombreCliente,
    ultimoMensaje: c.ultimoMensaje.toISOString(),
    estado: c.estado,
    esGrupo: c.esGrupo,
    iaHabilitada: c.iaHabilitada,
    atencionHumana: c.atencionHumana,
    mensajes: c.mensajes,
    agente: c.agente,
  }));

  return (
    <PageShell title="Chats">
      <p className="mb-4 max-w-2xl text-sm leading-relaxed text-[#C4B5FD]">
        Hilos de WhatsApp, Facebook Messenger e Instagram de tu empresa en una bandeja. Podés desactivar la IA por chat
        (por ejemplo conversaciones internas) y marcar cuándo un caso necesita humano o ya quedó resuelto.
      </p>
      <ConversacionesWhatsAppInbox initial={initial} />
    </PageShell>
  );
}
