import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/api-auth";

export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const denied = requireRole(s.session, ["SUPERADMIN"]);
  if (denied) return denied;

  const agentes = await prisma.agente.findMany({
    include: { empresa: { select: { id: true, nombre: true, email: true } } },
    orderBy: { creadoEn: "desc" },
  });
  return NextResponse.json(agentes);
}
