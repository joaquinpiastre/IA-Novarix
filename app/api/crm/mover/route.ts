import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { moverContactoEtapa } from "@/lib/crm";

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json()) as { contactoId?: string; nuevaEtapaId?: string };
  if (!body.contactoId || !body.nuevaEtapaId) {
    return NextResponse.json({ error: "contactoId y nuevaEtapaId requeridos" }, { status: 400 });
  }

  const contacto = await prisma.contacto.findFirst({
    where: { id: body.contactoId, empresaId: ctx.empresaId },
  });
  if (!contacto) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  const etapa = await prisma.etapaCRM.findFirst({
    where: { id: body.nuevaEtapaId, empresaId: ctx.empresaId },
  });
  if (!etapa) return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });

  const updated = await moverContactoEtapa(body.contactoId, body.nuevaEtapaId);
  return NextResponse.json(updated);
}
