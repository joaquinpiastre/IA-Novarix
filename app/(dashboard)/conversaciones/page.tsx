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
    include: { agente: { select: { nombre: true, responsableHumano: true } } },
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
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-[#A78BCC] md:text-sm">
        WhatsApp, Messenger e Instagram. Desactivá la IA por chat o marcá atención humana desde la barra inferior del
        hilo.
      </p>
      <ConversacionesWhatsAppInbox initial={initial} />
    </PageShell>
  );
}
