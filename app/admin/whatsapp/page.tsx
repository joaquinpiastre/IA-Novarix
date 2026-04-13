import { redirect } from "next/navigation";

/** Ruta histórica: el panel de canales Meta vive en /admin/meta */
export default function AdminWhatsappRedirectPage() {
  redirect("/admin/meta");
}
