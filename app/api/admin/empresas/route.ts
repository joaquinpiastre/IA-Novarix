import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/api-auth";
import { PLANES } from "@/lib/creditos";

export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const denied = requireRole(s.session, ["SUPERADMIN"]);
  if (denied) return denied;

  const empresas = await prisma.empresa.findMany({
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      plan: true,
      creditosUsados: true,
      creditosIncluidos: true,
      activo: true,
      rol: true,
    },
  });
  return NextResponse.json(empresas.filter((e) => e.rol === "CLIENTE"));
}

export async function POST(req: Request) {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const denied = requireRole(s.session, ["SUPERADMIN"]);
  if (denied) return denied;

  const body = await req.json();
  const { nombre, email, password, plan } = body as {
    nombre?: string;
    email?: string;
    password?: string;
    plan?: keyof typeof PLANES;
  };
  if (!nombre?.trim() || !email?.trim() || !password || password.length < 8) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const p = plan && PLANES[plan] ? plan : "BASIC";
  const creditosIncluidos = PLANES[p].creditosIncluidos;

  const exists = await prisma.empresa.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (exists) return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  const empresa = await prisma.empresa.create({
    data: {
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      rol: "CLIENTE",
      plan: p,
      creditosIncluidos,
    },
  });
  return NextResponse.json({ id: empresa.id, email: empresa.email, nombre: empresa.nombre });
}
