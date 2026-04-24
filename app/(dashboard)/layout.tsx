import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AppFooter } from "@/components/layout/AppFooter";
import { ExitImpersonation } from "@/components/layout/ExitImpersonation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const jar = await cookies();
  const impersonando =
    session?.user?.rol === "SUPERADMIN" && !!jar.get("novarix_impersonate")?.value;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
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
  );
}
