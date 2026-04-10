"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { NovarixLogo } from "@/components/layout/NovarixLogo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AppFooter } from "@/components/layout/AppFooter";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(
        res.error === "CredentialsSignin"
          ? "Email o contraseña incorrectos. Revisá mayúsculas y que sea el mismo mail con el que te dieron de alta."
          : res.error
      );
      return;
    }
    const next = search.get("callbackUrl") ?? "/";
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
      {process.env.NODE_ENV === "development" ? (
        <p className="text-xs leading-relaxed text-[#7C6FAE]">
          <strong className="text-[#9B8FC4]">Modo desarrollo:</strong> el superadmin se crea con{" "}
          <code className="rounded bg-[#2D0A5E]/60 px-1 text-[#C4B5FD]">npm run db:seed</code> usando{" "}
          <code className="text-[#C4B5FD]">ADMIN_EMAIL</code> y{" "}
          <code className="text-[#C4B5FD]">ADMIN_PASSWORD</code> de <code className="text-[#C4B5FD]">.env.local</code>.
          Si cambiaste esos valores, volvé a ejecutar el seed. Las empresas cliente usan el mail y clave que cargó el
          admin al darlas de alta.
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando…" : "Ingresar"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0118] bg-gradient-to-b from-[#0A0118] to-[#2D0A5E]">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <div className="flex justify-center">
            <NovarixLogo href="/login" />
          </div>
          <p className="mt-3 text-sm text-[#C4B5FD]">
            Automatizá tu atención. Escalá tu negocio.
          </p>
        </div>
        <Card className="w-full max-w-md">
          <h2 className="mb-6 text-lg font-semibold text-white">Iniciá sesión</h2>
          <Suspense fallback={<p className="text-sm text-[#7C6FAE]">Cargando…</p>}>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-[#7C6FAE]">
            ¿No tenés cuenta?{" "}
            <Link href="/register" className="text-[#A855F7] hover:underline">
              Registrate
            </Link>
          </p>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
