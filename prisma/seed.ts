import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Prisma solo carga .env; Next usa .env.local — el seed necesita ambos.
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "contacto@novarix.agency").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "CambiarAdmin123!";
  const hash = await bcrypt.hash(password, 12);

  await prisma.empresa.upsert({
    where: { email },
    create: {
      nombre: "Novarix Digital Agency",
      email,
      passwordHash: hash,
      rol: "SUPERADMIN",
      plan: "ENTERPRISE",
      creditosIncluidos: 999999,
    },
    update: {
      passwordHash: hash,
    },
  });

  console.log("Seed OK · superadmin:", email);
}

main()
  .catch((e) => {
    const msg = String((e as Error).message ?? "");
    if (
      msg.includes("Authentication failed") ||
      msg.includes("Can't reach database") ||
      msg.includes("ECONNREFUSED")
    ) {
      console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  No se pudo conectar a PostgreSQL                                ║
╠══════════════════════════════════════════════════════════════════╣
║  Revisá DATABASE_URL en .env.local (usuario, contraseña, puerto). ║
║                                                                  ║
║  Opción rápida con Docker (en esta carpeta):                     ║
║    docker compose up -d                                          ║
║  y en .env.local:                                                ║
║    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/novarix"
║                                                                  ║
║  Después: npx prisma db push && npm run db:seed                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
    }
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
