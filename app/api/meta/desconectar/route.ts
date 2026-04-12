import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

export async function POST() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  await prisma.empresa.update({
    where: { id: ctx.empresaId },
    data: {
      metaPageId: null,
      metaPageToken: null,
      metaPageNombre: null,
      metaInstagramId: null,
      metaInstagramUsername: null,
      metaConectadoEn: null,
    },
  });

  return NextResponse.json({ ok: true });
}
