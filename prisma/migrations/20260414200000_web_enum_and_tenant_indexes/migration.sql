-- Idempotente: seguro si el enum WEB o los índices ya existían (p. ej. tras un `db push` previo).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'TipoArchivo'
      AND e.enumlabel = 'WEB'
  ) THEN
    ALTER TYPE "TipoArchivo" ADD VALUE 'WEB';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "agentes_empresaId_idx" ON "agentes" ("empresaId");

CREATE INDEX IF NOT EXISTS "archivos_conocimiento_empresaId_idx" ON "archivos_conocimiento" ("empresaId");

CREATE INDEX IF NOT EXISTS "conversaciones_empresaId_idx" ON "conversaciones" ("empresaId");

CREATE INDEX IF NOT EXISTS "etapas_crm_empresaId_idx" ON "etapas_crm" ("empresaId");

CREATE INDEX IF NOT EXISTS "reglas_followup_empresaId_idx" ON "reglas_followup" ("empresaId");
