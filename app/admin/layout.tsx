import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { NovarixLogo } from "@/components/layout/NovarixLogo";
import { AppFooter } from "@/components/layout/AppFooter";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.rol !== "SUPERADMIN") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0118]">
      <header className="flex shrink-0 items-center justify-between border-b border-[#7B2FF7]/25 bg-[#0A0118]/95 px-3 py-3 backdrop-blur-sm sm:px-4">
        <NovarixLogo href="/admin" />
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm sm:gap-4">
          <span className="hidden text-[#7C6FAE] sm:inline">{session.user.email}</span>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[#A855F7] hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Panel cliente
          </Link>
          <SignOutButton variant="secondary" label="Cerrar sesión" />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <AdminSidebar />
        <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-[#0A0118] via-[#12081f] to-[#2D0A5E]/40">
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-8">{children}</main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
