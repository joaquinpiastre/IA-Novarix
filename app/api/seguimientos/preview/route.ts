import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { generarMensajeFollowUp, reemplazarVariables } from "@/lib/seguimientos";

export async function POST(req: Request) {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;

  const body = (await req.json()) as {
    usarIA?: boolean;
    promptMensaje?: string | null;
    mensajeFijo?: string | null;
  };

  const empresa = await prisma.empresa.findUnique({
    where: { id: ctx.empresaId },
    select: { nombre: true },
  });
  if (!empresa) return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });

  const contactoEjemplo = {
    nombre: "Juan Pérez",
    numero: "5492615551234",
  };

  try {
    if (body.usarIA !== false && body.promptMensaje?.trim()) {
      const texto = await generarMensajeFollowUp(body.promptMensaje, contactoEjemplo, empresa, "Interesado");
      return NextResponse.json({ texto });
    }
    const texto = reemplazarVariables(body.mensajeFijo || "", contactoEjemplo, empresa, "Interesado");
    return NextResponse.json({ texto });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
