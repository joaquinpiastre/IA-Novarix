export type BadgeVariant = "activo" | "inactivo" | "pro" | "creditosBajos" | "neutral";

const styles: Record<BadgeVariant, string> = {
  activo: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  inactivo: "bg-white/5 text-[#7C6FAE] border-white/10",
  pro: "bg-gradient-to-r from-[#7B2FF7]/40 to-[#C026D3]/40 text-white border-[#7B2FF7]/40",
  creditosBajos: "bg-[#C026D3]/25 text-[#f0abfc] border-[#C026D3]/50",
  neutral: "bg-[#2D0A5E]/80 text-[#C4B5FD] border-[#7B2FF7]/30",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-badge border px-2 py-0.5 text-xs font-medium ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
