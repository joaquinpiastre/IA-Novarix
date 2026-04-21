-- Idempotente: reglas con ámbito por números y exclusión ganado/perdido

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'reglas_followup'
      AND a.attname = 'numerosIncluidos' AND NOT a.attisdropped
  ) THEN
    ALTER TABLE "reglas_followup" ADD COLUMN "numerosIncluidos" JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'reglas_followup'
      AND a.attname = 'omitirGanadosPerdidos' AND NOT a.attisdropped
  ) THEN
    ALTER TABLE "reglas_followup" ADD COLUMN "omitirGanadosPerdidos" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;
