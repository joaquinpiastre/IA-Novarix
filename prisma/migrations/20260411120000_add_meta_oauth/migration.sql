-- Renombra campos Meta (idempotente: no falla si ya se aplicó con `db push` u otra corrida)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'empresas'
      AND a.attname = 'metaPageAccessToken'
      AND NOT a.attisdropped
  ) THEN
    ALTER TABLE "empresas" RENAME COLUMN "metaPageAccessToken" TO "metaPageToken";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'empresas'
      AND a.attname = 'metaPageName'
      AND NOT a.attisdropped
  ) THEN
    ALTER TABLE "empresas" RENAME COLUMN "metaPageName" TO "metaPageNombre";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'empresas'
      AND a.attname = 'metaInstagramAccountId'
      AND NOT a.attisdropped
  ) THEN
    ALTER TABLE "empresas" RENAME COLUMN "metaInstagramAccountId" TO "metaInstagramId";
  END IF;
END $$;
