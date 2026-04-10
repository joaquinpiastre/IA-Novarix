"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Bot,
  BookOpen,
  Plug,
  Package,
  MessageCircle,
  Server,
  Database,
  Coins,
  Receipt,
} from "lucide-react";

type Item = { href: string; label: string; icon: React.ElementType };

const sections: { title: string; items: Item[] }[] = [
  {
    title: "General",
    items: [
      { href: "/admin", label: "Resumen", icon: LayoutDashboard },
      { href: "/admin/empresas", label: "Empresas (tenants)", icon: Building2 },
      { href: "/admin/usuarios", label: "Usuarios", icon: Users },
    ],
  },
  {
    title: "Operación",
    items: [
      { href: "/admin/agentes", label: "Bots / Agentes", icon: Bot },
      { href: "/admin/conocimiento", label: "Conocimiento", icon: BookOpen },
      { href: "/admin/integraciones", label: "Integraciones", icon: Plug },
      { href: "/admin/productos", label: "Productos / Stock", icon: Package },
      { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
    ],
  },
  {
    title: "Técnico",
    items: [
      { href: "/admin/mcp", label: "Servidores MCP", icon: Server },
      { href: "/admin/vectorizacion", label: "Vectorización", icon: Database },
    ],
  },
  {
    title: "Negocio",
    items: [
      { href: "/admin/tokens", label: "Uso de tokens", icon: Coins },
      { href: "/admin/facturacion", label: "Facturación", icon: Receipt },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#7B2FF7]/25 bg-[#0A0118]">
      <div className="border-b border-[#7B2FF7]/20 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7C6FAE]">Super Admin</p>
        <p className="text-sm font-bold text-white">Panel de gestión</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {sections.map((sec) => (
          <div key={sec.title} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-[#C026D3]">
              {sec.title}
            </p>
            <ul className="space-y-0.5">
              {sec.items.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-[#7B2FF7]/25 text-white"
                          : "text-[#C4B5FD] hover:bg-[#2D0A5E]/70 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
