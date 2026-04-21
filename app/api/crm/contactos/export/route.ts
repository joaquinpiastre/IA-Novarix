import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { requireEmpresaContext } from "@/lib/api-auth";
import { asegurarEtapasPorDefecto } from "@/lib/crm";

const NOTAS_MAX = 30_000;

export async function GET() {
  const ctx = await requireEmpresaContext();
  if ("error" in ctx) return ctx.error;
  await asegurarEtapasPorDefecto(ctx.empresaId);

  const contactos = await prisma.contacto.findMany({
    where: { empresaId: ctx.empresaId },
    include: { etapa: true },
    orderBy: { ultimaInteraccion: "desc" },
  });

  const rows = contactos.map((c) => ({
    id: c.id,
    nombre: c.nombre ?? "",
    telefono_o_clave: c.numero,
    email: c.email ?? "",
    empresa_cliente: c.empresaCliente ?? "",
    etapa: c.etapa?.nombre ?? "",
    origen: c.origen,
    valor_oportunidad: c.valorOportunidad ?? "",
    ultima_interaccion: c.ultimaInteraccion.toISOString(),
    proximo_seguimiento: c.proximoSeguimiento?.toISOString() ?? "",
    notas: (c.notas ?? "").length > NOTAS_MAX ? `${(c.notas ?? "").slice(0, NOTAS_MAX)}…` : (c.notas ?? ""),
    creado_en: c.creadoEn.toISOString(),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contactos");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const filename = `crm-contactos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
