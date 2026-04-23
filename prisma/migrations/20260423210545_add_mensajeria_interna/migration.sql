-- CreateTable
CREATE TABLE "usuarios_internos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaActividad" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_internos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canales_internos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT DEFAULT '💬',
    "tipo" TEXT NOT NULL DEFAULT 'general',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "miembros" TEXT[],

    CONSTRAINT "canales_internos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_internos" (
    "id" TEXT NOT NULL,
    "canalId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "contenido" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'texto',
    "archivoUrl" TEXT,
    "archivoNombre" TEXT,
    "archivoTamano" INTEGER,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "leidoPor" TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editadoEn" TIMESTAMP(3),
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "replyAId" TEXT,

    CONSTRAINT "mensajes_internos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajeria_typing" (
    "canalId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajeria_typing_pkey" PRIMARY KEY ("canalId","usuarioId")
);

-- CreateIndex
CREATE INDEX "usuarios_internos_empresaId_idx" ON "usuarios_internos"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_internos_empresaId_email_key" ON "usuarios_internos"("empresaId", "email");

-- CreateIndex
CREATE INDEX "canales_internos_empresaId_idx" ON "canales_internos"("empresaId");

-- CreateIndex
CREATE INDEX "mensajes_internos_canalId_creadoEn_idx" ON "mensajes_internos"("canalId", "creadoEn");

-- CreateIndex
CREATE INDEX "mensajes_internos_empresaId_idx" ON "mensajes_internos"("empresaId");

-- CreateIndex
CREATE INDEX "mensajeria_typing_empresaId_idx" ON "mensajeria_typing"("empresaId");

-- AddForeignKey
ALTER TABLE "usuarios_internos" ADD CONSTRAINT "usuarios_internos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canales_internos" ADD CONSTRAINT "canales_internos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_internos" ADD CONSTRAINT "mensajes_internos_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "canales_internos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_internos" ADD CONSTRAINT "mensajes_internos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_internos" ADD CONSTRAINT "mensajes_internos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios_internos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_internos" ADD CONSTRAINT "mensajes_internos_replyAId_fkey" FOREIGN KEY ("replyAId") REFERENCES "mensajes_internos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajeria_typing" ADD CONSTRAINT "mensajeria_typing_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "canales_internos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajeria_typing" ADD CONSTRAINT "mensajeria_typing_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios_internos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
