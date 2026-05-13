import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AppFooter } from "@/components/layout/AppFooter";
import { ExitImpersonation } from "@/components/layout/ExitImpersonation";
import { I18nProvider } from "@/lib/i18n-context";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const jar = await cookies();
  const impersonando =
    session?.user?.rol === "SUPERADMIN" && !!jar.get("novarix_impersonate")?.value;

  return (
    <I18nProvider>
      <div className="flex min-h-screen flex-col">
        {/* Columna en móvil: barra superior + contenido a ancho completo. Fila desde md (sidebar + main). */}
        <div className="flex flex-1 flex-col md:flex-row">
          <DashboardSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-auto">
            <main className="flex-1 p-3 sm:p-4 md:p-8">
              {impersonando ? <ExitImpersonation /> : null}
              {children}
            </main>
            <AppFooter />
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}
