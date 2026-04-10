import Link from "next/link";
import { NovarixLogo } from "@/components/layout/NovarixLogo";
import { Card } from "@/components/ui/Card";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/Button";

export default function RegisterInfoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0118] bg-gradient-to-b from-[#0A0118] to-[#2D0A5E]">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <NovarixLogo href="/login" />
        <Card className="mt-8 w-full max-w-lg text-center">
          <h1 className="text-xl font-bold text-white">Registro no disponible</h1>
          <p className="mt-4 text-sm leading-relaxed text-[#C4B5FD]">
            Las cuentas de empresa las crea el equipo de Novarix. Si querés sumarte a Novarix AI
            Platform, escribinos y te damos de alta.
          </p>
          <p className="mt-2 text-sm text-[#7C6FAE]">
            Soporte:{" "}
            <a href="mailto:contacto@novarix.agency" className="text-[#A855F7] hover:underline">
              contacto@novarix.agency
            </a>
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button type="button" variant="secondary">
              Volver al login
            </Button>
          </Link>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
