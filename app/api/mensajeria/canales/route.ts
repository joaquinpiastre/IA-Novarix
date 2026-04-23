import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { ensureCanalesPorDefecto } from "@/lib/mensajeria-canales-default";
import { ensureUsuarioInterno } from "@/lib/mensajeria-usuario";
import { puedeVerCanal } from "@/lib/mensajeria-acceso";

async function ultimoMensajePorCanal(empresaId: string, canalIds: string[]) {
  if (!canalIds.length) return new Map<string, { preview: string; creadoEn: Date }>();
  const rows = await prisma.mensajeInterno.findMany({
    where: { empresaId, canalId: { in: canalIds }, eliminado: false },
    orderBy: { creadoEn: "desc" },
    take: 200,
    select: {
      canalId: true,
      contenido: true,
      tipo: true,
      archivoNombre: true,
      creadoEn: true,
      usuario: { select: { nombre: true } },
    },
  });
  const map = new Map<string, (typeof rows)[0]>();
  for (const r of rows) {
    if (!map.has(r.canalId)) map.set(r.canalId, r);
  }
  return new Map(
    Array.from(map.entries()).map(([id, m]) => {
      let preview = m.contenido?.slice(0, 80) ?? "";
      if (m.tipo === "imagen") preview = "🖼️ Imagen";
      else if (m.tipo === "audio") preview = "🎤 Audio";
      else if (m.tipo === "video") preview = "🎬 Video";
      else if (m.tipo === "archivo") preview = `📄 ${m.archivoNombre ?? "Archivo"}`;
      if (!preview && m.usuario?.nombre) preview = `${m.usuario.nombre} envió un adjunto`;
      return [id, { preview, creadoEn: m.creadoEn }];
    })
  );
}

async function noLeidosPorCanal(empresaId: string, canalIds: string[], miUsuarioId: string) {
  const entries = await Promise.all(
    canalIds.map(async (canalId) => {
      const c = await prisma.mensajeInterno.count({
        where: {
          empresaId,
          canalId,
          eliminado: false,
          usuarioId: { not: miUsuarioId },
          NOT: { leidoPor: { has: miUsuarioId } },
        },
      });
      return [canalId, c] as const;
    })
  );
  return new Map(entries);
}

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  await ensureCanalesPorDefecto(ctx.empresaId);

  const todos = await prisma.canalInterno.findMany({
    where: { empresaId: ctx.empresaId },
    orderBy: { creadoEn: "asc" },
  });
  const visibles = todos.filter((c) => puedeVerCanal(c, ctx.empresaId, yo.id));
  const ids = visibles.map((c) => c.id);
  const [ultimos, noLeidos] = await Promise.all([
    ultimoMensajePorCanal(ctx.empresaId, ids),
    noLeidosPorCanal(ctx.empresaId, ids, yo.id),
  ]);

  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: ctx.empresaId, activo: true },
    select: { id: true, ultimaActividad: true },
  });
  const online = (u: Date | null) => u && Date.now() - u.getTime() < 120_000;

  const lista = visibles.map((c) => {
    const u = ultimos.get(c.id);
    return {
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion,
      icono: c.icono,
      tipo: c.tipo,
      miembros: c.miembros,
      ultimoMensaje: u?.preview ?? "",
      ultimoMensajeEn: u?.creadoEn?.toISOString() ?? null,
      noLeidos: noLeidos.get(c.id) ?? 0,
      otroUsuario:
        c.tipo === "privado" && c.miembros.length
          ? c.miembros.filter((id) => id !== yo.id)[0] ?? null
          : null,
    };
  });

  const otroIds = Array.from(
    new Set(lista.map((l) => l.otroUsuario).filter((x): x is string => Boolean(x)))
  );
  const nombresOtros = await prisma.usuario.findMany({
    where: { id: { in: otroIds } },
    select: { id: true, nombre: true },
  });
  const nombrePorId = new Map(nombresOtros.map((x) => [x.id, x.nombre]));

  const enriched = lista.map((row) => ({
    ...row,
    tituloMostrar:
      row.tipo === "privado" && row.otroUsuario
        ? nombrePorId.get(row.otroUsuario) ?? "Chat directo"
        : row.nombre,
    online:
      row.tipo === "privado" && row.otroUsuario
        ? online(usuarios.find((u) => u.id === row.otroUsuario)?.ultimaActividad ?? null)
        : false,
  }));

  return NextResponse.json({ canales: enriched, yo: { id: yo.id, nombre: yo.nombre } });
}

/** Abre o crea un canal privado 1:1 con otro usuario de la misma empresa. */
export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  const yo = await ensureUsuarioInterno(ctx.empresaId, ctx.session);
  const body = (await req.json().catch(() => null)) as { otroUsuarioId?: string } | null;
  const otroId = body?.otroUsuarioId?.trim();
  if (!otroId) return NextResponse.json({ error: "otroUsuarioId requerido" }, { status: 400 });
  if (otroId === yo.id) return NextResponse.json({ error: "No podés chatear con vos mismo" }, { status: 400 });

  const otro = await prisma.usuario.findFirst({
    where: { id: otroId, empresaId: ctx.empresaId, activo: true },
  });
  if (!otro) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const privados = await prisma.canalInterno.findMany({
    where: { empresaId: ctx.empresaId, tipo: "privado" },
  });
  const pairKey = (ids: string[]) => [...ids].filter(Boolean).sort().join("|");
  const target = pairKey([yo.id, otro.id]);
  const existente = privados.find((c) => pairKey(c.miembros) === target);
  if (existente) return NextResponse.json({ canal: existente });

  const canal = await prisma.canalInterno.create({
    data: {
      empresaId: ctx.empresaId,
      nombre: otro.nombre,
      tipo: "privado",
      icono: "👤",
      descripcion: null,
      miembros: [yo.id, otro.id].sort(),
    },
  });
  return NextResponse.json({ canal });
}
