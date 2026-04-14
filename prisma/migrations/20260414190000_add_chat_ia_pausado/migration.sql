-- Idempotente: seguro si la columna ya existía (p. ej. tras `db push`).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'empresas'
      AND a.attname = 'chatIaPausado'
      AND NOT a.attisdropped
  ) THEN
    ALTER TABLE "empresas" ADD COLUMN "chatIaPausado" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
