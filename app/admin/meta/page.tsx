import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function AdminMetaPage() {
  const empresas = await prisma.empresa.findMany({
    where: { rol: "CLIENTE" },
    orderBy: { nombre: "asc" },
    select: {
      nombre: true,
      email: true,
      activo: true,
      whatsappPhoneId: true,
      whatsappNumero: true,
      metaPageId: true,
      metaPageNombre: true,
      metaInstagramId: true,
      metaInstagramUsername: true,
      metaConectadoEn: true,
    },
  });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-white">Meta · WhatsApp, Messenger e Instagram</h1>
      <p className="mb-4 max-w-3xl text-sm leading-relaxed text-[#7C6FAE]">
        La plataforma usa <strong className="text-[#C4B5FD]">dos webhooks</strong> en Meta Developers:{" "}
        <code className="rounded bg-[#2D0A5E]/80 px-1.5 py-0.5 text-[#A855F7]">/api/webhook/whatsapp</code>{" "}
        (Cloud API de WhatsApp; el tenant se identifica por{" "}
        <strong className="text-white">Phone Number ID</strong>) y{" "}
        <code className="rounded bg-[#2D0A5E]/80 px-1.5 py-0.5 text-[#A855F7]">/api/webhook/meta</code>{" "}
        (Messenger + Instagram Direct; la empresa se vincula por OAuth en{" "}
        <strong className="text-white">Configuración</strong> del panel cliente).
      </p>

      <Card className="mb-6 border-[#7B2FF7]/25 bg-[#0A0118]/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#C026D3]">Resumen técnico</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#C4B5FD]">
          <li>
            <span className="text-white">WhatsApp</span>: credenciales por tenant (Phone ID + token) en
            configuración.
          </li>
          <li>
            <span className="text-white">Messenger</span>: requiere página de Facebook conectada; eventos{" "}
            <code className="text-[#A855F7]">page</code> en el webhook unificado.
          </li>
          <li>
            <span className="text-white">Instagram</span>: cuenta profesional vinculada a esa página; eventos{" "}
            <code className="text-[#A855F7]">instagram</code> en el mismo webhook.
          </li>
        </ul>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[#7B2FF7]/20 text-[#C4B5FD]">
            <tr>
              <th className="p-4">Empresa</th>
              <th className="p-4">WhatsApp</th>
              <th className="p-4">Messenger (Facebook)</th>
              <th className="p-4">Instagram</th>
              <th className="p-4">Cuenta</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => {
              const waOk = !!e.whatsappPhoneId?.trim();
              const metaOk = !!e.metaPageId?.trim();
              const igOk = !!e.metaInstagramId?.trim();
              return (
                <tr key={e.email} className="border-b border-[#7B2FF7]/10 text-[#C4B5FD]">
                  <td className="p-4 align-top">
                    <p className="font-medium text-white">{e.nombre}</p>
                    <p className="mt-0.5 text-xs text-[#7C6FAE]">{e.email}</p>
                  </td>
                  <td className="p-4 align-top">
                    <div className="space-y-1">
                      <p className="font-mono text-xs text-white">{e.whatsappPhoneId?.trim() || "—"}</p>
                      <p className="text-xs">Prueba: {e.whatsappNumero?.trim() || "—"}</p>
                      <Badge variant={waOk ? "activo" : "inactivo"}>
                        {waOk ? "Configurado" : "Sin Phone ID"}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="space-y-1">
                      <p className="text-white">{e.metaPageNombre?.trim() || "—"}</p>
                      <p className="font-mono text-xs break-all text-[#7C6FAE]">
                        {e.metaPageId?.trim() || "—"}
                      </p>
                      <Badge variant={metaOk ? "activo" : "inactivo"}>
                        {metaOk ? "OAuth OK" : "Sin conectar"}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <div className="space-y-1">
                      <p className="text-white">
                        {e.metaInstagramUsername?.trim()
                          ? `@${e.metaInstagramUsername.replace(/^@/, "")}`
                          : "—"}
                      </p>
                      <p className="font-mono text-xs break-all text-[#7C6FAE]">
                        {e.metaInstagramId?.trim() || "—"}
                      </p>
                      <Badge variant={igOk ? "activo" : "inactivo"}>
                        {igOk ? "IG vinculado" : "Sin IG"}
                      </Badge>
                      {e.metaConectadoEn ? (
                        <p className="text-[10px] text-[#7C6FAE]">
                          Meta: {new Date(e.metaConectadoEn).toLocaleString("es-AR")}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <Badge variant={e.activo ? "activo" : "inactivo"}>{e.activo ? "Activa" : "Off"}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
