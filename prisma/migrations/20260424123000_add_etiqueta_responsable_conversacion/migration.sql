-- Etiqueta opcional para asignación de chats a personas específicas
ALTER TABLE "conversaciones"
ADD COLUMN IF NOT EXISTS "etiquetaResponsable" TEXT;
