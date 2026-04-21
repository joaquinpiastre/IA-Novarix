import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireRole } from "@/lib/api-auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const denied = requireRole(s.session, ["SUPERADMIN"]);
  if (denied) return denied;

  const agente = await prisma.agente.findUnique({
    where: { id: params.id },
    include: { empresa: { select: { id: true, nombre: true, email: true } } },
  });
  if (!agente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(agente);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const denied = requireRole(s.session, ["SUPERADMIN"]);
  if (denied) return denied;

  const existing = await prisma.agente.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = (await req.json()) as {
    nombre?: string;
    slug?: string | null;
    descripcion?: string | null;
    prompt?: string;
    promptTenant?: string | null;
    activo?: boolean;
    esDefault?: boolean;
    codigoActivacion?: string | null;
    permiteTransferencia?: boolean;
    busquedaProductos?: boolean;
    temperatura?: number;
    modeloOpenai?: string;
    maxTokens?: number;
    responsableHumano?: string | null;
  };

  if (body.esDefault === true) {
    await prisma.agente.updateMany({
      where: { empresaId: existing.empresaId },
      data: { esDefault: false },
    });
  }

  const codigo = body.codigoActivacion !== undefined ? body.codigoActivacion?.trim() || null : undefined;
  if (codigo !== undefined && codigo !== existing.codigoActivacion) {
    const clash = await prisma.agente.findFirst({
      where: { codigoActivacion: codigo, NOT: { id: existing.id } },
    });
    if (clash) {
      return NextResponse.json({ error: "Esa palabra clave ya la usa otro agente" }, { status: 400 });
    }
  }

  const agente = await prisma.agente.update({
    where: { id: params.id },
    data: {
      ...(body.nombre != null && { nombre: body.nombre.trim() }),
      ...(body.slug !== undefined && { slug: body.slug?.trim() || null }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion?.trim() || null }),
      ...(body.prompt != null && { prompt: body.prompt.trim() }),
      ...(body.promptTenant !== undefined && { promptTenant: body.promptTenant?.trim() || null }),
      ...(body.activo != null && { activo: body.activo }),
      ...(body.esDefault != null && { esDefault: body.esDefault }),
      ...(codigo !== undefined && { codigoActivacion: codigo }),
      ...(body.permiteTransferencia != null && { permiteTransferencia: body.permiteTransferencia }),
      ...(body.busquedaProductos != null && { busquedaProductos: body.busquedaProductos }),
      ...(body.temperatura != null && Number.isFinite(body.temperatura) && { temperatura: body.temperatura }),
      ...(body.modeloOpenai != null && { modeloOpenai: body.modeloOpenai.trim() }),
      ...(body.maxTokens != null && Number.isFinite(body.maxTokens) && { maxTokens: Math.min(8192, Math.max(256, Math.floor(body.maxTokens))) }),
      ...(body.responsableHumano !== undefined && {
        responsableHumano: body.responsableHumano?.trim() || null,
      }),
    },
    include: { empresa: { select: { nombre: true, email: true } } },
  });

  return NextResponse.json(agente);
}
