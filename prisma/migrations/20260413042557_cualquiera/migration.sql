-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMIN', 'CLIENTE');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TipoArchivo" AS ENUM ('EXCEL', 'PDF', 'CSV', 'TEXTO');

-- CreateEnum
CREATE TYPE "EstadoConversacion" AS ENUM ('ACTIVA', 'RESUELTA', 'DERIVADA_HUMANO');

-- CreateEnum
CREATE TYPE "AtencionHumanaEstado" AS ENUM ('NINGUNA', 'ACTIVA', 'RESUELTA');

-- CreateEnum
CREATE TYPE "OrigenContacto" AS ENUM ('WHATSAPP', 'MANUAL', 'IMPORTADO', 'FACEBOOK', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "CanalConversacion" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "TipoDisparador" AS ENUM ('TIEMPO_EN_ETAPA', 'SIN_RESPUESTA', 'ETAPA_ESPECIFICA', 'FECHA_PROGRAMADA');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('PENDIENTE', 'ENVIADO', 'ERROR');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'CLIENTE',
    "plan" "Plan" NOT NULL DEFAULT 'BASIC',
    "creditosIncluidos" INTEGER NOT NULL DEFAULT 50,
    "creditosUsados" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNumero" TEXT,
    "whatsappToken" TEXT,
    "whatsappPhoneId" TEXT,
    "whatsappVerifyToken" TEXT,
    "metaPageId" TEXT,
    "metaPageToken" TEXT,
    "metaPageNombre" TEXT,
    "metaInstagramId" TEXT,
    "metaInstagramUsername" TEXT,
    "metaConectadoEn" TIMESTAMP(3),
    "stockApiUrl" TEXT,
    "stockApiToken" TEXT,
    "stockApiKeyHeader" TEXT,
    "cotizacionIncluyeGrupos" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agentes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT,
    "descripcion" TEXT,
    "prompt" TEXT NOT NULL,
    "promptTenant" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "esDefault" BOOLEAN NOT NULL DEFAULT false,
    "codigoActivacion" TEXT,
    "permiteTransferencia" BOOLEAN NOT NULL DEFAULT false,
    "busquedaProductos" BOOLEAN NOT NULL DEFAULT true,
    "temperatura" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "modeloOpenai" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "maxTokens" INTEGER NOT NULL DEFAULT 1024,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agentes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_conocimiento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "agenteId" TEXT,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoArchivo" NOT NULL,
    "url" TEXT NOT NULL,
    "contenido" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_conocimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "agenteId" TEXT,
    "numeroCliente" TEXT NOT NULL,
    "nombreCliente" TEXT,
    "estado" "EstadoConversacion" NOT NULL DEFAULT 'ACTIVA',
    "esGrupo" BOOLEAN NOT NULL DEFAULT false,
    "iaHabilitada" BOOLEAN NOT NULL DEFAULT true,
    "atencionHumana" "AtencionHumanaEstado" NOT NULL DEFAULT 'NINGUNA',
    "mensajes" JSONB NOT NULL DEFAULT '[]',
    "tokensUsados" INTEGER NOT NULL DEFAULT 0,
    "creditosUsados" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iniciadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoMensaje" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactoId" TEXT,
    "canal" "CanalConversacion" NOT NULL DEFAULT 'WHATSAPP',

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "nombre" TEXT,
    "email" TEXT,
    "empresaCliente" TEXT,
    "etapaId" TEXT,
    "valorOportunidad" DOUBLE PRECISION,
    "notas" TEXT,
    "proximoSeguimiento" TIMESTAMP(3),
    "ultimaInteraccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origen" "OrigenContacto" NOT NULL DEFAULT 'WHATSAPP',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_crm" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7B2FF7',
    "orden" INTEGER NOT NULL,
    "esGanado" BOOLEAN NOT NULL DEFAULT false,
    "esPerdido" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etapas_crm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_etapas" (
    "id" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "etapaAnterior" TEXT,
    "etapaNueva" TEXT NOT NULL,
    "cambiadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_etapas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_followup" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "disparador" "TipoDisparador" NOT NULL,
    "diasEnEtapa" INTEGER,
    "horasSinRespuesta" INTEGER,
    "etapaDisparoId" TEXT,
    "usarIA" BOOLEAN NOT NULL DEFAULT true,
    "promptMensaje" TEXT,
    "mensajeFijo" TEXT,
    "moverAEtapaId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reglas_followup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seguimientos_enviados" (
    "id" TEXT NOT NULL,
    "reglaId" TEXT NOT NULL,
    "contactoId" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'PENDIENTE',
    "enviadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" "CanalConversacion",

    CONSTRAINT "seguimientos_enviados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_email_key" ON "empresas"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agentes_codigoActivacion_key" ON "agentes"("codigoActivacion");

-- CreateIndex
CREATE UNIQUE INDEX "contactos_empresaId_numero_key" ON "contactos"("empresaId", "numero");

-- AddForeignKey
ALTER TABLE "agentes" ADD CONSTRAINT "agentes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_conocimiento" ADD CONSTRAINT "archivos_conocimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos_conocimiento" ADD CONSTRAINT "archivos_conocimiento_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "agentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "agentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos" ADD CONSTRAINT "contactos_etapaId_fkey" FOREIGN KEY ("etapaId") REFERENCES "etapas_crm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_crm" ADD CONSTRAINT "etapas_crm_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_etapas" ADD CONSTRAINT "historial_etapas_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_followup" ADD CONSTRAINT "reglas_followup_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_enviados" ADD CONSTRAINT "seguimientos_enviados_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "reglas_followup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguimientos_enviados" ADD CONSTRAINT "seguimientos_enviados_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
