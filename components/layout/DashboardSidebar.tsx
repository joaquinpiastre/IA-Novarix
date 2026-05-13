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
  Users,
  Bell,
  BarChart2,
  Menu,
  X,
  FileText,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { NovarixLogo } from "./NovarixLogo";
import { SignOutButton } from "./SignOutButton";
import { MensajeriaNavLink } from "./MensajeriaNavLink";
import { useI18n } from "@/lib/i18n-context";

export function DashboardSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t, lang, toggle } = useI18n();

  const items = [
    { href: "/", label: "Inicio", icon: LayoutDashboard },
    { href: "/agentes", label: "Agentes", icon: Bot },
    { href: "/conversaciones", label: "Chats", icon: MessageSquare },
    { href: "/mensajeria", label: "__MENSAJERIA__", icon: MessageSquare },
    { href: "/crm", label: "CRM", icon: Users },
    { href: "/seguimientos", label: "Seguimientos", icon: Bell },
    { href: "/plantillas", label: t("templates"), icon: FileText },
    { href: "/estadisticas", label: "Estadísticas", icon: BarChart2 },
    { href: "/conocimiento", label: "Conocimiento", icon: BookOpen },
    { href: "/creditos", label: "Créditos", icon: Coins },
    { href: "/configuracion", label: "Configuración", icon: Settings },
  ];

  const menuItems = (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        if (label === "__MENSAJERIA__") {
          return <MensajeriaNavLink key={href} />;
        }
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
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
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex w-full min-w-0 shrink-0 items-center justify-between border-b border-[#7B2FF7]/20 bg-[#0A0118]/95 px-3 py-2 backdrop-blur-md md:hidden">
        <NovarixLogo />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-[#C4B5FD] hover:bg-[#2D0A5E]/60 hover:text-white"
          aria-label="Abrir menú"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-20 bg-black/55 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col border-r border-[#7B2FF7]/20 bg-[#0A0118]/95 backdrop-blur-md transition-transform md:static md:w-60 md:max-w-none md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-[#7B2FF7]/20 p-6">
          <NovarixLogo />
          <p className="mt-2 text-xs italic text-[#7C6FAE]">
            Automatizá tu atención. Escalá tu negocio.
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">{menuItems}</nav>
        <div className="border-t border-[#7B2FF7]/20 p-3 space-y-2">
          <button
            type="button"
            onClick={toggle}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#C4B5FD] transition-colors hover:bg-[#2D0A5E]/60 hover:text-white"
            title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
          >
            <Globe className="h-4 w-4 shrink-0 opacity-90" />
            <span>{lang === "es" ? "EN" : "ES"} · {t("switchLang")}</span>
          </button>
          <SignOutButton
            variant="ghost"
            label="Cerrar sesión"
            className="w-full justify-center text-[#C4B5FD] hover:text-white"
          />
        </div>
      </aside>
    </>
  );
}
