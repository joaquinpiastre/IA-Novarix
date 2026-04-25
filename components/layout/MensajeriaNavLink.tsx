"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { useEffect, useState } from "react";

export function MensajeriaNavLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/mensajeria");
  const [n, setN] = useState(0);
  const hayNoLeidos = n > 0 && !active;

  useEffect(() => {
    const pull = async () => {
      try {
        const r = await fetch("/api/mensajeria/unread");
        if (r.ok) {
          const j = (await r.json()) as { total?: number };
          setN(typeof j.total === "number" ? j.total : 0);
        }
      } catch {
        /* noop */
      }
    };
    void pull();
    const t = setInterval(pull, 20000);
    const ev = () => void pull();
    window.addEventListener("novarix-mensajeria-unread", ev);
    return () => {
      clearInterval(t);
      window.removeEventListener("novarix-mensajeria-unread", ev);
    };
  }, []);

  return (
    <Link
      href="/mensajeria"
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#7B2FF7]/20 text-white"
          : hayNoLeidos
            ? "animate-pulse text-white hover:bg-[#2D0A5E]/60"
            : "text-[#C4B5FD] hover:bg-[#2D0A5E]/60"
      }`}
    >
      <MessagesSquare className={`h-4 w-4 shrink-0 opacity-90 ${hayNoLeidos ? "text-red-300" : ""}`} />
      <span className="flex-1">Mensajería</span>
      {n > 0 ? (
        <span
          className={`min-w-[1.25rem] rounded-full bg-red-500 px-1.5 text-center text-[10px] font-bold leading-5 text-white ${
            hayNoLeidos ? "animate-pulse" : ""
          }`}
        >
          {n > 99 ? "99+" : n}
        </span>
      ) : null}
    </Link>
  );
}
