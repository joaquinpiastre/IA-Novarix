"use client";

import { useSession } from "next-auth/react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function DashboardHeader({ title }: { title: string }) {
  const { data } = useSession();
  const isAdmin = data?.user?.rol === "SUPERADMIN";

  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#7B2FF7]/20 bg-[#0A0118]/40 px-3 py-3 backdrop-blur-md sm:px-4 md:px-8 md:py-4">
      <h1 className="text-lg font-bold text-white md:text-xl">{title}</h1>
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden text-right text-sm sm:block">
          <p className="text-white">{data?.user?.name}</p>
          <p className="text-xs text-[#7C6FAE]">{data?.user?.email}</p>
        </div>
        {isAdmin ? (
          <Link href="/admin">
            <Button type="button" variant="secondary" size="sm" className="gap-2 px-2.5 sm:px-3">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </Link>
        ) : null}
        <SignOutButton variant="ghost" label="Salir" />
      </div>
    </header>
  );
}
