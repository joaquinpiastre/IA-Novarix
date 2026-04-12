import { prisma } from "@/lib/db";
import { registrarWebhooksMetaPagina } from "@/lib/meta-graph";
import type { PaginaOAuthPendiente } from "@/lib/meta-oauth-pending";

export async function guardarPaginaMetaYWebhooks(empresaId: string, p: PaginaOAuthPendiente): Promise<void> {
  const ig = p.instagram_business_account;
  await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      metaPageId: p.id,
      metaPageToken: p.access_token,
      metaPageNombre: p.name,
      metaInstagramId: ig?.id ?? null,
      metaInstagramUsername: ig?.username ?? null,
      metaConectadoEn: new Date(),
    },
  });
  await registrarWebhooksMetaPagina(p.id, p.access_token, ig?.id ?? null);
}
