import { NextResponse } from "next/server";
import type { AtencionHumanaEstado, EstadoConversacion } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const conv = await prisma.conversacion.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
    include: { agente: { select: { nombre: true, id: true, responsableHumano: true } } },
  });
  if (!conv) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const body = (await req.json()) as {
    iaHabilitada?: boolean;
    atencionHumana?: AtencionHumanaEstado;
    estado?: EstadoConversacion;
    nombreCliente?: string | null;
    accionMensaje?: "editar" | "eliminar";
    mensajeIndex?: number;
    mensajeTexto?: string;
  };

  const existing = await prisma.conversacion.findFirst({
    where: { id: params.id, empresaId: ctx.empresaId },
  });
  if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  if (body.accionMensaje) {
    const idx = Number.isInteger(body.mensajeIndex) ? Number(body.mensajeIndex) : -1;
    const prev = Array.isArray(existing.mensajes) ? [...existing.mensajes] : [];
    if (idx < 0 || idx >= prev.length) {
      return NextResponse.json({ error: "mensajeIndex inválido" }, { status: 400 });
    }

    if (body.accionMensaje === "editar") {
      const nuevoTexto = typeof body.mensajeTexto === "string" ? body.mensajeTexto.trim() : "";
      if (!nuevoTexto) {
        return NextResponse.json({ error: "mensajeTexto requerido" }, { status: 400 });
      }
      const target = prev[idx];
      if (!target || typeof target !== "object" || Array.isArray(target)) {
        return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
      }
      prev[idx] = {
        ...(target as Record<string, unknown>),
        content: nuevoTexto,
        editedAt: new Date().toISOString(),
      };
    } else {
      prev.splice(idx, 1);
    }

    const updated = await prisma.conversacion.update({
      where: { id: params.id },
      data: { mensajes: prev },
      include: { agente: { select: { nombre: true, id: true, responsableHumano: true } } },
    });
    return NextResponse.json(updated);
  }

  const data: {
    iaHabilitada?: boolean;
    atencionHumana?: AtencionHumanaEstado;
    estado?: EstadoConversacion;
    nombreCliente?: string | null;
  } = {};

  if (typeof body.iaHabilitada === "boolean") data.iaHabilitada = body.iaHabilitada;
  if (body.nombreCliente !== undefined) data.nombreCliente = body.nombreCliente?.trim() || null;

  if (body.atencionHumana != null) {
    const allowed: AtencionHumanaEstado[] = ["NINGUNA", "ACTIVA", "RESUELTA"];
    if (!allowed.includes(body.atencionHumana)) {
      return NextResponse.json({ error: "atencionHumana inválido" }, { status: 400 });
    }
    data.atencionHumana = body.atencionHumana;
    if (body.atencionHumana === "ACTIVA") data.estado = "DERIVADA_HUMANO";
    else if (body.atencionHumana === "RESUELTA") data.estado = "ACTIVA";
    else data.estado = "ACTIVA";
  } else if (body.estado != null) {
    const estados: EstadoConversacion[] = ["ACTIVA", "RESUELTA", "DERIVADA_HUMANO"];
    if (!estados.includes(body.estado)) {
      return NextResponse.json({ error: "estado inválido" }, { status: 400 });
    }
    data.estado = body.estado;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const updated = await prisma.conversacion.update({
    where: { id: params.id },
    data,
    include: { agente: { select: { nombre: true, id: true, responsableHumano: true } } },
  });
  return NextResponse.json(updated);
}
