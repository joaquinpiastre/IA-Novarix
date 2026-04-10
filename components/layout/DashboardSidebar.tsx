"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  BookOpen,
  Coins,
  Settings,
} from "lucide-react";
import { NovarixLogo } from "./NovarixLogo";
import { SignOutButton } from "./SignOutButton";

const items = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/agentes", label: "Agentes", icon: Bot },
  { href: "/conversaciones", label: "Chats", icon: MessageSquare },
  { href: "/conocimiento", label: "Conocimiento", icon: BookOpen },
  { href: "/creditos", label: "Créditos", icon: Coins },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-[#7B2FF7]/20 bg-[#0A0118]/80 backdrop-blur-md">
      <div className="border-b border-[#7B2FF7]/20 p-6">
        <NovarixLogo />
        <p className="mt-2 text-xs italic text-[#7C6FAE]">
          Automatizá tu atención. Escalá tu negocio.
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#7B2FF7]/20 text-white"
                  : "text-[#C4B5FD] hover:bg-[#2D0A5E]/60"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#7B2FF7]/20 p-3">
        <SignOutButton
          variant="ghost"
          label="Cerrar sesión"
          className="w-full justify-center text-[#C4B5FD] hover:text-white"
        />
      </div>
    </aside>
  );
}
