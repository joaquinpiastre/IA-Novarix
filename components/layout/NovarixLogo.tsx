import Link from "next/link";

export function NovarixLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex flex-col leading-tight">
      <span className="text-xl font-bold tracking-tight text-white">NOVARIX</span>
      <span className="bg-gradient-to-r from-[#7B2FF7] to-[#C026D3] bg-clip-text text-sm font-bold text-transparent">
        AI PLATFORM
      </span>
    </Link>
  );
}
