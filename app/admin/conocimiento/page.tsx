import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";

export default async function AdminConocimientoPage() {
  const archivos = await prisma.archivoConocimiento.findMany({
    orderBy: { creadoEn: "desc" },
    take: 400,
    include: { empresa: { select: { nombre: true } }, agente: { select: { nombre: true } } },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Conocimiento</h1>
      <p className="mb-6 text-sm text-[#7C6FAE]">
        Vista global de archivos y textos cargados por tenant. Cada cliente también gestiona desde su panel.
      </p>
      <Card className="max-h-[70vh] overflow-auto p-0">
        <ul className="divide-y divide-[#7B2FF7]/15">
          {archivos.map((f) => (
            <li key={f.id} className="px-4 py-3 text-sm">
              <p className="font-medium text-white">{f.nombre}</p>
              <p className="text-xs text-[#7C6FAE]">
                {f.empresa.nombre} · {f.tipo}
                {f.agente ? ` · Agente: ${f.agente.nombre}` : ""} ·{" "}
                {f.creadoEn.toLocaleString("es-AR")}
              </p>
            </li>
          ))}
        </ul>
        {!archivos.length ? <p className="p-6 text-[#7C6FAE]">Sin registros.</p> : null}
      </Card>
      <p className="mt-4 text-xs text-[#7C6FAE]">
        Próximo paso posible: vectorización y búsqueda semántica (ver menú Vectorización).
      </p>
    </div>
  );
}
