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
    <header className="flex items-center justify-between border-b border-[#7B2FF7]/20 bg-[#0A0118]/40 px-8 py-4 backdrop-blur-md">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <p className="text-white">{data?.user?.name}</p>
          <p className="text-xs text-[#7C6FAE]">{data?.user?.email}</p>
        </div>
        {isAdmin ? (
          <Link href="/admin">
            <Button type="button" variant="secondary" size="sm" className="gap-2">
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        ) : null}
        <SignOutButton variant="ghost" label="Salir" />
      </div>
    </header>
  );
}
