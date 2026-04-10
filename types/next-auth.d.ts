import type { Rol } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      rol: Rol;
      empresaId: string;
    };
  }

  interface User {
    rol: Rol;
    empresaId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol: Rol;
    empresaId: string;
  }
}
