import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getEffectiveEmpresaId } from "@/lib/session-empresa";
import { prisma } from "@/lib/db";
import {
  ConversacionesWhatsAppInbox,
  type InboxRow,
} from "@/components/conversaciones/ConversacionesWhatsAppInbox";

export const dynamic = "force-dynamic";

export default async function AdminChatsPage() {
  const session = await getServerSession(authOptions);
  const empresaId = await getEffectiveEmpresaId(session);

  if (!empresaId) {
    return (
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C026D3]">Super Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Chats de clientes</h1>
        <p className="mt-3 text-sm text-[#C4B5FD]">
          Para interactuar con chats desde admin primero necesitás seleccionar una empresa para impersonar.
        </p>
        <div className="mt-4">
          <Link
            href="/admin/empresas"
            className="inline-flex rounded-lg border border-[#7B2FF7]/40 bg-[#2D0A5E]/60 px-3 py-2 text-sm font-medium text-white hover:bg-[#3A1280]"
          >
            Ir a Empresas y seleccionar &quot;Ver como empresa&quot;
          </Link>
        </div>
      </div>
    );
  }

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
    <div className="flex h-[calc(100dvh-11.5rem)] min-h-[360px] w-full flex-col md:h-[calc(100vh-12rem)]">
      <div className="mb-3 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C026D3]">Super Admin</p>
        <h1 className="text-2xl font-bold text-white">Chats de clientes</h1>
        <p className="mt-1 text-sm text-[#7C6FAE]">
          Interacción en vivo con WhatsApp, Messenger e Instagram de la empresa impersonada.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ConversacionesWhatsAppInbox initial={initial} miEtiquetaUsuario={session?.user?.name ?? null} />
      </div>
    </div>
  );
}
