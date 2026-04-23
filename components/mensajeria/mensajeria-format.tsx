import type { ReactNode } from "react";

export function formatRelativo(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "ahora";
  if (diff < 3600_000) return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86400_000) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

export function etiquetaDia(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const mismo = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (mismo(d, hoy)) return "Hoy";
  if (mismo(d, ayer)) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function renderRichText(text: string, highlight?: string): ReactNode {
  const parts: ReactNode[] = [];
  const esc = highlight?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = esc ? new RegExp(`(${esc})`, "gi") : null;
  const chunks = re ? text.split(re) : [text];
  let key = 0;
  for (const chunk of chunks) {
    if (esc && re && chunk.toLowerCase() === highlight!.toLowerCase()) {
      parts.push(
        <mark key={key++} className="rounded bg-[#7B2FF7]/50 px-0.5 text-white">
          {chunk}
        </mark>
      );
      continue;
    }
    const sub = chunk.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g);
    for (const s of sub) {
      if (s.startsWith("*") && s.endsWith("*") && s.length > 2) {
        parts.push(<strong key={key++}>{s.slice(1, -1)}</strong>);
      } else if (s.startsWith("_") && s.endsWith("_") && s.length > 2) {
        parts.push(<em key={key++}>{s.slice(1, -1)}</em>);
      } else if (s.startsWith("~") && s.endsWith("~") && s.length > 2) {
        parts.push(<del key={key++}>{s.slice(1, -1)}</del>);
      } else if (s) {
        parts.push(<span key={key++}>{s}</span>);
      }
    }
  }
  return <>{parts}</>;
}
