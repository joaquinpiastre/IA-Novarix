import Link from "next/link";
import { NovarixLogo } from "@/components/layout/NovarixLogo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AppFooter } from "@/components/layout/AppFooter";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0118] bg-gradient-to-b from-[#0A0118] to-[#2D0A5E]">
      <div className="flex flex-1 flex-col items-center px-4 py-12">
        <NovarixLogo href="/login" />
        <Card className="mt-8 w-full max-w-4xl">
          <h1 className="text-2xl font-bold text-white">Politica de privacidad</h1>
          <p className="mt-2 text-sm text-[#7C6FAE]">
            Ultima actualizacion: 20 de abril de 2026
          </p>

          <p className="mt-6 text-sm leading-relaxed text-[#C4B5FD]">
            En Novarix Digital Agency valoramos tu privacidad. Esta politica explica
            como recopilamos, usamos y protegemos la informacion al utilizar nuestra
            plataforma SaaS de mensajeria con IA.
          </p>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white">1. Recopilacion de datos</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#C4B5FD]">
              Podemos recopilar datos de registro (como nombre, email y empresa),
              metadatos tecnicos (IP, navegador, dispositivo, registros de acceso) y
              datos operativos necesarios para prestar el servicio.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white">2. Uso de mensajes</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#C4B5FD]">
              Los mensajes y conversaciones procesados en la plataforma se utilizan para
              entregar la funcionalidad del servicio, mejorar la calidad de respuesta de
              los agentes de IA y brindar soporte tecnico cuando sea necesario. No
              vendemos el contenido de tus mensajes a terceros.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white">3. Almacenamiento y seguridad</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#C4B5FD]">
              La informacion se almacena en infraestructura con medidas razonables de
              seguridad tecnica y organizativa. Conservamos los datos durante el tiempo
              necesario para operar la plataforma, cumplir obligaciones legales y resolver
              disputas.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white">4. Derechos del usuario</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#C4B5FD]">
              Podes solicitar acceso, rectificacion, actualizacion o eliminacion de tus
              datos personales, asi como oponerte a ciertos tratamientos cuando resulte
              aplicable segun la normativa vigente.
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold text-white">5. Contacto</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#C4B5FD]">
              Si tenes consultas sobre esta politica o sobre el tratamiento de datos,
              escribinos a{" "}
              <a href="mailto:contacto@novarix.agency" className="text-[#A855F7] hover:underline">
                contacto@novarix.agency
              </a>
              .
            </p>
          </section>

          <div className="mt-8">
            <Link href="/login">
              <Button type="button" variant="secondary">
                Volver al login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
      <AppFooter />
    </div>
  );
}
