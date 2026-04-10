import { prisma } from "@/lib/db";
import { EmpresasAdmin } from "@/components/admin/EmpresasAdmin";

export default async function AdminEmpresasPage() {
  const empresas = await prisma.empresa.findMany({
    where: { rol: "CLIENTE" },
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      plan: true,
      creditosUsados: true,
      creditosIncluidos: true,
      activo: true,
    },
  });

  return <EmpresasAdmin initial={empresas} />;
}
