import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminAgenteEditor } from "@/components/admin/AdminAgenteEditor";

export default async function AdminAgenteDetallePage({ params }: { params: { id: string } }) {
  const existe = await prisma.agente.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!existe) notFound();

  return <AdminAgenteEditor agenteId={params.id} />;
}
