import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password.trim();
        const empresa = await prisma.empresa.findUnique({
          where: { email },
        });
        if (!empresa) return null;
        if (!empresa.activo) {
          throw new Error(
            "Tu cuenta está suspendida. Escribinos o pedile al administrador que la reactive."
          );
        }
        if (!empresa.passwordHash) return null;
        const ok = await bcrypt.compare(password, empresa.passwordHash);
        if (!ok) return null;
        return {
          id: empresa.id,
          email: empresa.email,
          name: empresa.nombre,
          rol: empresa.rol,
          empresaId: empresa.id,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.empresaId = user.empresaId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.rol = token.rol;
        session.user.empresaId = token.empresaId;
      }
      return session;
    },
  },
   secret:
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === "development"
      ? "novarix-dev-inseguro-solo-local-cambiame"
      : undefined),
};
