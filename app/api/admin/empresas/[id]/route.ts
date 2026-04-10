import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/api-auth";
import { PLANES } from "@/lib/creditos";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const denied = requireRole(s.session, ["SUPERADMIN"]);
  if (denied) return denied;

  const body = await req.json();
  const { activo, plan } = body as { activo?: boolean; plan?: keyof typeof PLANES };

  const existing = await prisma.empresa.findFirst({
    where: { id: params.id, rol: "CLIENTE" },
  });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const data: { activo?: boolean; plan?: keyof typeof PLANES; creditosIncluidos?: number } = {};
  if (activo != null) data.activo = activo;
  if (plan && PLANES[plan]) {
    data.plan = plan;
    data.creditosIncluidos = PLANES[plan].creditosIncluidos;
  }

  await prisma.empresa.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}
