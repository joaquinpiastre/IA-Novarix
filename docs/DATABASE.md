# Base de datos y multi-tenant (50+ empresas)

Objetivo: que los cambios de código y esquema **no pierdan datos** ni dejen la BD **desalineada** del código.

## Regla de oro: migraciones versionadas

- Los cambios de tablas/enums van en **`prisma/migrations/*/migration.sql`** y se versionan en Git.
- **Producción / staging**: antes de levantar la app, ejecutar  
  `npx prisma migrate deploy`  
  (con `DATABASE_URL` apuntando a esa base). En hosting, suele ser un paso del deploy **antes** de `next start`.
- **Desarrollo local**: al tocar `prisma/schema.prisma`, crear migración con  
  `npm run db:migrate:dev`  
  (nombre descriptivo del cambio).

## Qué evitar

- **`prisma db push`** contra bases con datos reales: no deja historial reproducible y puede provocar **drift** (esquema distinto entre entornos) o sorpresas en columnas. Reservalo solo a prototipos locales vacíos si hace falta.
- **Borrar o renombrar columnas** sin plan: en migraciones, preferí pasos en dos fases (añadir columna nueva → backfill → deprecar vieja) si hay datos importantes.

## Multi-tenant (aislamiento por empresa)

- Casi todas las tablas de negocio llevan **`empresaId`**. Las rutas API deben usar **`requireEmpresaContext()`** y filtrar siempre con ese id.
- No uses `empresaId` enviado por el cliente sin validar que coincida con el del token / impersonación.
- Los índices por `empresaId` en tablas grandes reducen riesgo de degradación cuando crece el número de empresas y filas.

## Antes de tocar producción

1. Backup de PostgreSQL (snapshot o `pg_dump`).
2. Probar `migrate deploy` en staging con el mismo SQL que irá a prod.
3. Desplegar código compatible con el esquema **antes o junto** con la migración (migraciones expansivas primero: solo `ADD` nullable / defaults).

## Referencias en el repo

- Esquema y notas: `prisma/schema.prisma` (bloque de comentarios bajo `datasource`).
- Cliente DB: `lib/db.ts`.
- Contexto tenant: `lib/api-auth.ts` (`requireEmpresaContext`).
