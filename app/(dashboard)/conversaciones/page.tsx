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
    etiquetaResponsable: c.etiquetaResponsable,
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
      <div className="flex h-[calc(100dvh-6.75rem)] min-h-[360px] w-full flex-col md:h-[calc(100vh-7.25rem)]">
        <div className="min-h-0 flex-1 overflow-hidden">
          <ConversacionesWhatsAppInbox initial={initial} miEtiquetaUsuario={session?.user?.name ?? null} />
        </div>
        <p className="mt-2 max-w-3xl shrink-0 border-t border-[rgba(123,47,247,0.12)] pt-2.5 text-xs leading-relaxed text-[#A78BCC] md:text-sm">
          WhatsApp, Messenger e Instagram. La IA puede responder automáticamente;{" "}
          <strong className="text-white/95">vos podés escribir</strong> en el cuadro al pie del chat y el cliente lo
          recibe en su app. Desactivá la IA o marcá atención humana desde la misma barra.
        </p>
      </div>
    </PageShell>
  );
}
