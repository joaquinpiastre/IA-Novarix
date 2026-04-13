# Novarix AI Platform — Documentación funcional y técnica

Este documento describe **qué hace la aplicación**, **cómo se organiza**, **con qué servicios se conecta** y **qué hay que configurar** para operarla o auditarla **sin leer el código**. Está pensado para handoff a otra persona (QA, DevOps, socio técnico, auditoría interna).

---

## 1. Qué es el producto (visión general)

**Novarix AI Platform** es una aplicación web **multi-tenant** (cada “empresa” es un cliente aislado en base de datos) que permite:

1. **Atención automatizada con IA** sobre canales de mensajería:
   - **WhatsApp Business (Cloud API de Meta)** — webhook; además de **texto**, soporta **audio** (transcripción con **Whisper**) e **imágenes** (análisis con **GPT-4o** vision); el agente responde con el mismo contexto (conocimiento + stock opcional). Otros tipos (documento, video, etc.) reciben respuesta fija **sin** gastar el turno completo del modelo cuando aplica el flujo “fallback”.
   - **Facebook Messenger e Instagram (DM)** — tras conectar la **página de Facebook** con OAuth; mismos agentes y conocimiento que WhatsApp; respuestas vía Graph API de Meta.

2. **Panel web para el cliente**: gestión de **agentes (bots)**, **conversaciones**, **CRM** (embudo Kanban), **seguimientos automáticos** (mensajes programados/reglas), **estadísticas**, **créditos de uso**, **configuración** de integraciones.

3. **Panel Super Admin** (`/admin`): visión agregada de empresas, métricas de negocio estimadas, gestión de tenants; varias secciones son **placeholders** (pantallas informativas sin lógica completa).

La IA **no** corre en el navegador: corre en el **servidor Node.js** (rutas API y procesamiento de webhooks).

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 14** (App Router), React 18 |
| Lenguaje | **TypeScript** |
| Estilos | **Tailwind CSS** |
| Base de datos | **PostgreSQL** vía **Prisma ORM** |
| Autenticación | **NextAuth.js** (estrategia JWT, proveedor **Credentials**: email + contraseña contra tabla `Empresa`) |
| IA | **OpenAI** (SDK + `fetch`): chat con modelo configurable por agente (default `gpt-4o-mini`); **Whisper** para audio WhatsApp; **GPT-4o** para visión en imágenes WhatsApp |
| Archivos (opcional) | **Supabase Storage** — bucket `conocimiento` si hay `SUPABASE_*` |
| Jobs en proceso | **node-cron** — cada **30 minutos** revisa reglas de seguimiento (si no está desactivado) |
| Drag & drop CRM | **@dnd-kit** |

Scripts relevantes en `package.json`:

- `npm run dev` — desarrollo.
- `npm run build` — `prisma generate` + `next build`.
- `npm run db:push` — aplica esquema Prisma a la DB usando `.env.local`.
- `npm run db:seed` — crea/actualiza usuario **SUPERADMIN** (ver sección seed).
- `npm run db:setup` — push + seed.

---

## 3. Modelo de datos y multi-tenant

### 3.1 Entidad central: `Empresa`

Cada fila en `empresas` representa:

- **Cuenta de login** (email único, `passwordHash` con bcrypt).
- **Rol**: `CLIENTE` (uso normal del panel) o `SUPERADMIN` (acceso a `/admin` y capacidad de **impersonar** empresas).
- **Plan y créditos**: `plan` (BASIC / PRO / ENTERPRISE), `creditosIncluidos`, `creditosUsados` (consumo acumulado, ver sección créditos).
- **WhatsApp (por empresa)**: `whatsappPhoneId`, `whatsappToken`, `whatsappVerifyToken`, `whatsappNumero` (número para pruebas de envío).
- **Meta (Messenger + Instagram)**: `metaPageId`, `metaPageToken`, `metaPageNombre`, `metaInstagramId`, `metaInstagramUsername`, `metaConectadoEn` — se rellenan con el flujo OAuth en `/configuracion`.
- **Stock / ERP (opcional)**: `stockApiUrl`, `stockApiToken`, `stockApiKeyHeader`, y flag `cotizacionIncluyeGrupos` (si las cotizaciones deben considerar chats de grupo de WhatsApp).
- **Estado**: `activo` — si es `false`, el login rechaza con mensaje de cuenta suspendida.

### 3.2 Otros modelos importantes (resumen)

- **`Agente`**: prompt del sistema, modelo OpenAI, temperatura, max tokens, `esDefault`, `codigoActivacion` (ruteo por palabra clave — ver código si se usa en routing), `busquedaProductos` (si false, no llama a la API de stock), `permiteTransferencia`, etc.
- **`ArchivoConocimiento`**: textos/archivos asociados a la empresa y opcionalmente a un agente concreto (`agenteId` null = aplica a todos los que lean esa empresa).
- **`Conversacion`**: hilo por `(empresaId, numeroCliente, canal)` lógico; `mensajes` en JSON (array `user`/`assistant`); los ítems pueden incluir **`tipo`** (`text` \| `audio` \| `image` \| `fallback`) y **`timestamp`** (ISO) en WhatsApp cuando el pipeline lo guarda; flags `iaHabilitada`, `atencionHumana`, `estado`; `canal`: WHATSAPP \| MESSENGER \| INSTAGRAM.
- **`Contacto` + `EtapaCRM` + `HistorialEtapa`**: CRM Kanban; contacto único por `(empresaId, numero)` donde `numero` en WhatsApp es el teléfono; en Meta puede ser `m:<psid>` (Messenger) o `ig:<igsid>` (Instagram).
- **`ReglaFollowUp` + `SeguimientoEnviado`**: reglas de seguimiento y log de envíos. **`SeguimientoEnviado.canal`** (opcional): `WHATSAPP` \| `MESSENGER` \| `INSTAGRAM` — indica por qué canal se intentó el envío.

El esquema completo está en `prisma/schema.prisma`.

---

## 4. Autenticación, sesión e impersonación

### 4.1 Login

- Ruta UI: `/login`.
- API: NextAuth en `/api/auth/[...nextauth]`.
- Credenciales validadas contra **Prisma** → tabla `Empresa`.

### 4.2 Middleware (`middleware.ts`)

Solo aplica a rutas listadas en `config.matcher` (principalmente **dashboard** y **`/admin`**). Las rutas **`/api/*` no están en ese matcher**, por lo que **no pasan por el middleware de NextAuth** a nivel de path; la seguridad de cada endpoint API depende de que el handler llame a `requireSession` / `requireEmpresaContext` donde corresponda.

**Excepción de producto**: rutas públicas necesarias para Meta (webhooks) están implementadas sin exigir sesión en el propio handler.

### 4.3 SUPERADMIN vs CLIENTE

- Un usuario con `rol === SUPERADMIN` que entra a `/`, `/agentes`, etc. **sin** cookie de impersonación es **redirigido a `/admin`**.
- Cookie **`novarix_impersonate`**: contiene el `empresaId` del tenant que el superadmin está “viendo”. Mientras exista, `getEffectiveEmpresaId()` devuelve ese id y el dashboard muestra datos de **esa** empresa.
- Endpoints: `/api/admin/impersonate` (POST para setear cookie), `/api/auth/clear-impersonate` para salir.

### 4.4 Registro público

- Existe la ruta `/register` pero muestra **“Registro no disponible”**; las cuentas se crean manualmente (seed o inserción en DB / herramientas internas).

---

## 5. Variables de entorno (referencia operativa)

Archivo de ejemplo: **`.env.example`** (copiar a **`.env.local`** en desarrollo).

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Cadena PostgreSQL para Prisma. **Obligatoria** para casi todo. |
| `NEXTAUTH_SECRET` | Firma de JWT NextAuth. **Obligatoria en producción** (en dev hay fallback inseguro documentado en código). |
| `NEXTAUTH_URL` | URL base de la app para NextAuth (ej. `http://localhost:3000`). |
| `OPENAI_API_KEY` | Llamadas a OpenAI (respuestas de agentes, seguimientos con IA, endpoint de prueba `/api/ai/responder`). **Obligatoria** para que la IA responda. |
| `WHATSAPP_VERIFY_TOKEN` | Token que Meta envía en el challenge del webhook GET; debe coincidir con lo configurado en Meta. |
| `WHATSAPP_APP_SECRET` | Para verificar firma `X-Hub-Signature-256` del webhook WhatsApp en **producción**. |
| `WHATSAPP_API_VERSION` | Versión Graph API (default `v18.0`). |
| `META_APP_ID` / `META_APP_SECRET` | App de Meta (Messenger/Instagram OAuth y webhook Meta). Si `META_APP_SECRET` vacío, en parte del código se usa `WHATSAPP_APP_SECRET`. |
| `META_WEBHOOK_VERIFY_TOKEN` | Opcional; si vacío, para webhook Meta GET se usa `WHATSAPP_VERIFY_TOKEN`. |
| `META_OAUTH_REDIRECT_URI` | Opcional; override explícito del redirect OAuth (si no, se arma con `NEXT_PUBLIC_APP_URL` o `NEXTAUTH_URL` + `/api/meta/oauth/callback`). |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (OAuth redirect, enlaces). Prioridad sobre `NEXTAUTH_URL` en flujos Meta documentados en código. |
| `NEXT_PUBLIC_APP_NAME` | Nombre visible (branding). |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Opcional: subida de archivos de conocimiento a Storage bucket `conocimiento`. Sin esto, archivos pueden quedar con URL placeholder `local://`. |
| `SUPABASE_ANON_KEY` | Presente en ejemplo; revisar uso exacto en `lib/supabase.ts` si se audita seguridad. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed del superadmin (`npm run db:seed`). |
| `CRON_SECRET` | Si está definido, `GET /api/cron/seguimientos` exige header `Authorization: Bearer <CRON_SECRET>`. |
| `DISABLE_CRM_CRON` | Si vale `1`, **no** se programa el cron interno de node-cron en el proceso Next (útil en serverless donde el proceso no es persistente). |
| `ENABLE_AUDIO` | Si vale **`false`**, en WhatsApp **no** se transcribe audio con Whisper (respuesta amable fija). Cualquier otro valor o vacío = audio habilitado. |
| `ENABLE_VISION` | Si vale **`false`**, en WhatsApp **no** se analizan imágenes con GPT-4o vision. Cualquier otro valor o vacío = visión habilitada. |

Variables adicionales detectadas en código: `META_OAUTH_SECRET` (fallback para firmar estado OAuth si no hay `NEXTAUTH_SECRET`), `META_GRAPH_API_VERSION` (alternativa a `WHATSAPP_API_VERSION` en `lib/meta-graph.ts`).

---

## 6. Pantallas del panel cliente (dashboard)

Rutas bajo layout con sidebar (`DashboardSidebar`). Navegación principal:

| Ruta | Nombre en UI | Función |
|------|----------------|---------|
| `/` | Inicio | KPIs: créditos usados/incluidos, conversaciones del mes, actividad hoy, agentes activos, gráfico 7 días, últimas conversaciones. |
| `/agentes` | Agentes | Lista y CRUD de agentes; edición de prompts, modelo, temperatura, palabra de activación, etc. |
| `/agentes/[id]` | Detalle agente | Formulario de un agente. |
| `/conversaciones` | Chats | Bandeja estilo inbox (WhatsApp y otros canales según datos). |
| `/conversaciones/[id]` | Detalle conversación | Historial, acciones humanas/IA según implementación en componentes/API. |
| `/crm` | CRM | Tablero Kanban por etapas; contactos. |
| `/crm/contactos/[id]` | Ficha contacto | Detalle, notas, etapa, etc. |
| `/crm/configuracion` | Config CRM | Etapas del embudo (orden, colores, ganado/perdido). |
| `/seguimientos` | Seguimientos | Reglas de follow-up automático. |
| `/seguimientos/nuevo` | Nueva regla | Alta de regla. |
| `/estadisticas` | Estadísticas | Embudo, métricas CRM, seguimientos; datos desde `/api/estadisticas`. |
| `/conocimiento` | Base de conocimiento | Archivos y textos; subida vía `/api/archivos`. |
| `/creditos` | Créditos | Consumo, tablas por día/agente; enlace WhatsApp a Novarix para “comprar” (externo al código). |
| `/configuracion` | Configuración | **MetaConexionCard** (OAuth Messenger/Instagram) + **ConfiguracionForm** (WhatsApp, stock API, contraseña, pruebas). |

---

## 7. Panel Super Admin (`/admin`)

Acceso: usuario `Empresa` con `rol = SUPERADMIN`. Layout propio (`AdminSidebar`).

| Ruta | Estado típico |
|------|----------------|
| `/admin` | **Funcional**: métricas agregadas (conversaciones, revenue estimado por planes, costo OpenAI aproximado, margen). |
| `/admin/empresas` | **Funcional**: listado de empresas cliente; componente `EmpresasAdmin` con acciones vía API admin. |
| `/admin/usuarios`, `/admin/agentes`, `/admin/conocimiento`, etc. | Mezcla de **gestión real** y **placeholders** (`AdminPlaceholder`): conviene verificar archivo por archivo si se audita “qué falta”; varias páginas explican futuras features (MCP, vectorización, etc.). |

APIs bajo `/api/admin/*` suelen exigir rol SUPERADMIN (revisar cada `route.ts` en una auditoría fina).

---

## 8. Integraciones externas (cómo “se conecta” la app)

### 8.1 WhatsApp Cloud API (Meta)

1. **Configuración en Meta Developers**: crear/configurar app, número, token de acceso permanente, Phone Number ID. Para **audio/imagen**, la app de Meta debe poder **recibir** esos campos en el webhook (campos de mensajes habituales en la suscripción del webhook).
2. **En la app**: en `/configuracion` (formulario empresa) el cliente guarda `whatsappPhoneId`, `whatsappToken`, `whatsappVerifyToken`, `whatsappNumero`.
3. **Webhook** (`app/api/webhook/whatsapp/route.ts` + `lib/procesar-mensaje-whatsapp.ts`):
   - **URL de callback**: `https://<TU_DOMINIO>/api/webhook/whatsapp`
   - **GET (verificación)**: la app compara `hub.verify_token` con `WHATSAPP_VERIFY_TOKEN` (variable de entorno global). **Importante**: el `whatsappVerifyToken` por empresa en DB se usa para otros flujos de UI/guardado; el **challenge del webhook** en código usa la env **`WHATSAPP_VERIFY_TOKEN`**. Quien audite debe confirmar que **Meta Developers** tenga el mismo valor que `WHATSAPP_VERIFY_TOKEN` (o documentar explícitamente cualquier desalineación intencional).
   - **POST**: acepta mensajes con **`text`** (cuerpo no vacío), **`audio`** (con `audio.id`), **`image`** (con `image.id`), y otros **`type`** hacia el procesador (documento, video, sticker, ubicación, contactos, tipos desconocidos → respuesta controlada). Ignora payloads incompletos (p. ej. texto sin `body`). Identifica empresa por **`phone_number_id` === `Empresa.whatsappPhoneId`**.
4. **Firma en producción**: si `NODE_ENV === "production"`, se valida firma con `WHATSAPP_APP_SECRET`.
5. **Flujo interno** (`lib/procesar-mensaje-whatsapp.ts`):
   - Resuelve el “texto del turno” con **`resolverTextoDelMensaje`**: texto plano; **audio** → descarga con **`descargarMediaWhatsApp`** en `lib/whatsapp.ts` + **Whisper** (`lib/openai.ts`); **imagen** → descarga + **GPT-4o vision** (límite ~5 MB por imagen); documento / video / sticker / ubicación / contactos / resto → mensaje de **fallback** (sin llamada al agente principal cuando el tipo es tratado como fallback).
   - **`ENABLE_AUDIO`** / **`ENABLE_VISION`**: si son la cadena **`false`**, audio o imagen no pasan por Whisper/Vision y se responde con mensaje fijo.
   - **Créditos extra**: además del turno del agente (`gpt-4o-mini` por defecto), se suman créditos derivados de uso de **vision** (tokens reportados por la API) y una **estimación por audio** (basada en duración Whisper) a empresa y conversación.
   - Luego: contacto CRM → agente default o primero activo → si no hay bloqueo humano/IA off → (si no es solo fallback) contexto + **OpenAI** del agente → actualización de `mensajes` (con `tipo`/`timestamp` en mensajes de usuario cuando aplica) y créditos → **`enviarMensajeWhatsApp`**.

**Grupos WhatsApp**: si el `from` parece grupo (`@g.us`), se marca `esGrupo`; el flag `cotizacionIncluyeGrupos` afecta lógica de cotización en otras partes del código (buscar `cotizacion` si se audita ese módulo).

### 8.2 Messenger e Instagram (Meta) — OAuth por empresa

1. **Variables globales**: `META_APP_ID`, `META_APP_SECRET` (o `WHATSAPP_APP_SECRET`), URLs públicas correctas (`NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL`).
2. **Flujo**: desde `/configuracion`, el usuario inicia OAuth (`/api/meta/oauth/inicio` o redirect desde `/api/meta/oauth/start`). Callback en `/api/meta/oauth/callback`. Puede requerir **selección de página** si hay varias (`/api/meta/seleccion/pendiente`, `confirmar`).
3. **Tokens** se guardan en `Empresa` (page id, page token, instagram id/username).
4. **Webhook unificado**: `https://<TU_DOMINIO>/api/webhook/meta`
   - GET: verify token = `META_WEBHOOK_VERIFY_TOKEN` o fallback `WHATSAPP_VERIFY_TOKEN`.
   - POST: objeto `page` → busca empresa por `metaPageId` === `entry.id`; objeto `instagram` → busca por `metaInstagramId` o fallback `metaPageId`.
5. **Envío de respuesta**: `lib/meta-graph.ts` (Messenger / Instagram con page token).

### 8.3 OpenAI

- Las operaciones del producto usan **`OPENAI_API_KEY`** (chat del agente, seguimientos con IA, prueba `/api/ai/responder`, **transcripciones** y **visión** en WhatsApp).
- Consumo interno: **créditos** ≈ tokens del modelo / 10 000 (`lib/creditos.ts`); en WhatsApp con multimedia pueden sumarse **créditos previos** (Whisper/vision) antes del mensaje del agente.

### 8.4 API de stock / ERP (HTTP GET JSON)

- Configurada **por empresa**: URL + token + header opcional en `/configuracion`.
- El servidor hace GET (timeout ~12s), parsea JSON flexible (`lib/stock-api.ts`) y trunca a ~14k caracteres para inyectar en el prompt.
- Si el ERP requiere IP fija o SSL propio, puede fallar: el formulario tiene acción **“probar stock API”** que devuelve preview o error explícito.

### 8.5 Supabase (opcional)

- Si `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` están configurados, los uploads de conocimiento pueden guardarse en bucket **`conocimiento`**.
- Sin Supabase, el comportamiento de archivos binarios puede ser limitado (URLs `local://` según `app/api/archivos/route.ts`).

---

## 9. API REST — inventario orientado a auditoría

Convención: la mayoría de rutas bajo `/api/*` (excepto webhooks, NextAuth, cron con secret) requieren **sesión válida** y muchas **`requireEmpresaContext`** (tenant actual o impersonado).

Lista de archivos `route.ts` bajo `app/api` (abril 2026):

- **`/api/auth/[...nextauth]`** — NextAuth.
- **`/api/auth/clear-impersonate`** — limpia impersonación.
- **`/api/webhook/whatsapp`** — webhook WhatsApp (público).
- **`/api/webhook/meta`** — webhook Messenger/Instagram (público).
- **`/api/empresa`** — GET/PUT datos empresa; POST acciones: cambio password, probar WhatsApp, probar stock.
- **`/api/agentes`, `/api/agentes/[id]`** — CRUD agentes tenant.
- **`/api/archivos`** — GET lista; POST JSON (texto manual) o multipart (archivo).
- **`/api/conversaciones`, `/api/conversaciones/[id]`, `/api/conversaciones/cotizacion-fuentes`** — inbox y detalle; fuentes para cotización.
- **`/api/crm/*`** — contactos, etapas, mover tarjeta.
- **`/api/seguimientos`, `/api/seguimientos/[id]`, `/api/seguimientos/preview`** — reglas y vista previa.
- **`/api/estadisticas`** — agregados para gráficos del dashboard.
- **`/api/creditos`** — datos de créditos (si existe lógica adicional además de la página server-side).
- **`/api/ai/responder`** — **prueba** de agente sin WhatsApp (incrementa `creditosUsados` de la empresa).
- **`/api/cron/seguimientos`** — ejecuta el mismo job que el cron interno, con `Bearer CRON_SECRET`.
- **`/api/meta/*`** — OAuth, desconectar, selección de página.
- **`/api/admin/*`** — empresas, agentes, métricas, impersonate, etc.

Para una auditoría de seguridad: verificar **cada** `route.ts` que use `requireEmpresaContext` y que filtre siempre por `empresaId` del contexto (no confiar en IDs del body sin comprobar pertenencia al tenant).

---

## 10. Jobs y seguimientos automáticos

### 10.1 Cron interno (Node)

- Archivo `instrumentation.ts` importa `iniciarCronSeguimientos()` solo en runtime **nodejs**.
- `jobs/seguimientos.ts`: cada **30 minutos** ejecuta `ejecutarSeguimientosJob()` salvo `DISABLE_CRM_CRON=1`.
- El job recorre **reglas activas** y contactos elegibles según `lib/seguimientos.ts`.

### 10.2 Disparadores implementados en backend

En `lib/seguimientos.ts`, función **`encontrarContactosElegibles`**:

- **`TIEMPO_EN_ETAPA`**: contactos en una etapa X al menos N días sin haber recibido ya esta regla.
- **`SIN_RESPUESTA`**: sin respuesta/interacción hace N horas (según `ultimaInteraccion`).
- **`FECHA_PROGRAMADA`**: `proximoSeguimiento <= ahora` y aún no enviada la regla.
- **`ETAPA_ESPECIFICA`**: contactos de la empresa en **`etapaId === regla.etapaDisparoId`** que **no** tengan ya un `SeguimientoEnviado` para esa `reglaId` (puede disparar a todos los que ya estaban en la etapa en la primera pasada del cron; no distingue “recién entró” salvo que se evolucione el modelo).

### 10.3 Canal de envío del seguimiento

En `jobs/seguimientos.ts`, según prefijo de **`Contacto.numero`**:

- **`ig:`** → **`enviarMensajeInstagram`** (`lib/meta-graph.ts`) con `metaPageToken` + `metaInstagramId` de la empresa.
- **`m:`** → **`enviarMensajeMessenger`** con `metaPageToken`.
- **Resto** → **WhatsApp** (`enviarMensajeWhatsApp`) con `whatsappPhoneId` y `whatsappToken`.

Cada registro en **`SeguimientoEnviado`** puede incluir **`canal`** (`WHATSAPP` \| `MESSENGER` \| `INSTAGRAM`) para auditoría. Requiere columna en DB: aplicar **`prisma db push`** (o migración) si el esquema se actualizó después de un clone antiguo.

### 10.4 Dependencias

- Reglas con **`usarIA`**: requieren `OPENAI_API_KEY` y `promptMensaje`; si falta la key, fallará la generación.
- **WhatsApp**: `whatsappPhoneId` + `whatsappToken` si el contacto no es Meta.
- **Messenger / Instagram en seguimientos**: `metaPageToken`; para Instagram también **`metaInstagramId`**. Si falta lo necesario, se crea `SeguimientoEnviado` con estado **`ERROR`** y el **`canal`** correspondiente.

### 10.5 Cron externo (Vercel / sistema)

- Si el hosting **no mantiene** el proceso vivo (serverless), usar `DISABLE_CRM_CRON=1` y un scheduler HTTP que llame **`GET /api/cron/seguimientos`** con `Authorization: Bearer <CRON_SECRET>`.
- Si `CRON_SECRET` no está definido, ese endpoint responde 401 siempre.

---

## 11. Créditos y planes

Definidos en `lib/creditos.ts`:

- **1 crédito = 10 000 tokens** procesados (aproximación para facturación interna).
- Planes BASIC / PRO / ENTERPRISE con créditos incluidos y “precio mensual” usados en **estimaciones del admin** (no es pasarela de pago integrada en código).
- `PRECIO_CREDITO_EXTRA` es constante de referencia en UI (USD).

**WhatsApp multimedia** (resumen de coste lógico): además del turno del agente, entran **Whisper** (audio) y **GPT-4o** (imagen); el código acumula créditos extra en empresa/conversación según tokens de vision y una fórmula por duración de audio. Desactivar procesamiento (sin ahorrar del todo el coste de Meta) se puede con **`ENABLE_AUDIO=false`** / **`ENABLE_VISION=false`**.

---

## 12. Middleware y rutas públicas (matiz)

El `matcher` del middleware **no incluye** `/api`. Las APIs deben autenticarse solas. Las páginas del dashboard **sí** exigen token en middleware para las rutas listadas.

La ruta **`/register`** está permitida en el callback `authorized` junto con `/login`.

---

## 13. Checklist para otra persona (“qué revisar sin ver código”)

### Infraestructura

- [ ] PostgreSQL accesible y `DATABASE_URL` correcta.
- [ ] `npx prisma db push` (o migraciones si migraron a migrations) ejecutado contra el entorno correcto.
- [ ] `npm run db:seed` ejecutado al menos una vez para tener SUPERADMIN (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
- [ ] `NEXTAUTH_SECRET` y `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` alineados con el dominio real (HTTPS en prod).

### OpenAI

- [ ] `OPENAI_API_KEY` válida y con cuota/billing activo.
- [ ] Probar respuesta desde una conversación o `/api/ai/responder` (con sesión).

### WhatsApp

- [ ] En Meta: webhook apuntando al dominio correcto, verify token = **`WHATSAPP_VERIFY_TOKEN`**.
- [ ] En la empresa (UI configuración): Phone Number ID, token permanente, verify token guardado si aplica al flujo interno.
- [ ] En prod: `WHATSAPP_APP_SECRET` para firma del webhook POST.
- [ ] Suscripción del webhook: incluir campos para **mensajes** que permitan **texto, audio, imagen** (y los que quieras tratar como fallback).
- [ ] Opcional: `ENABLE_AUDIO=false` o `ENABLE_VISION=false` para desactivar Whisper o visión sin tocar código.
- [ ] Probar botón **“probar WhatsApp”** en configuración; probar envío real de **texto**, **nota de voz** e **imagen** contra el entorno de prueba o producción.

### Messenger / Instagram

- [ ] App Meta con productos Messenger/Instagram configurados, OAuth redirect permitido = `…/api/meta/oauth/callback`.
- [ ] Webhook **`/api/webhook/meta`** suscrito a `page` e `instagram` según necesidad.
- [ ] Variables `META_APP_ID` / `META_APP_SECRET` (o fallback `WHATSAPP_APP_SECRET`).
- [ ] Completar flujo OAuth desde `/configuracion` y verificar que `metaPageId` y tokens quedan en DB.

### Stock / ERP

- [ ] URL devuelve JSON que el parser pueda leer (ver formatos soportados en documentación de `formatearJsonCatalogo` en código o probar con el botón de prueba).
- [ ] Auth: header custom vs Bearer.

### Supabase (si se desea upload en la nube)

- [ ] Proyecto Supabase, bucket `conocimiento`, políticas de storage, keys en env.

### Seguimientos

- [ ] Si el deploy es serverless: **`DISABLE_CRM_CRON=1`** + cron HTTP a `/api/cron/seguimientos` con `CRON_SECRET`.
- [ ] Tras actualizar el esquema: **`db push`** para la columna **`SeguimientoEnviado.canal`** (si la base era anterior a ese cambio).
- [ ] Reglas **`ETAPA_ESPECIFICA`**: revisar que el comportamiento (todos los contactos ya en la etapa elegibles una vez por regla) es el deseado para negocio.
- [ ] Contactos **`m:`** / **`ig:`**: OAuth Meta completo y tokens válidos si las reglas deben enviar seguimientos por Messenger/Instagram.

### Seguridad / producto

- [ ] Revisar que no haya **secrets** commiteados (solo `.env.example` en repo).
- [ ] Definir proceso de **alta de empresas CLIENTE** (no hay self-service register).

---

## 14. Glosario rápido

| Término | Significado en esta app |
|---------|-------------------------|
| Tenant | Una fila `Empresa` (cliente aislado). |
| Agente / Bot | Configuración de prompt + modelo OpenAI asociada a la empresa. |
| Conversación | Hilo de mensajes con un usuario final en un canal. |
| Crédito | Unidad de consumo derivada de tokens (10k tokens ≈ 1 crédito). |
| Impersonación | Superadmin viendo el panel como si fuera otra empresa. |

---

## 15. Ubicación del código (mapa de navegación para quien sí abra el repo después)

- **UI dashboard**: `app/(dashboard)/**`
- **UI admin**: `app/admin/**`
- **Auth pages**: `app/(auth)/**`
- **API**: `app/api/**`
- **Lógica de negocio compartida**: `lib/**` (`procesar-mensaje-whatsapp.ts`, `procesar-mensaje-meta.ts`, `openai.ts` —incluye Whisper y visión—, `crm.ts`, `seguimientos.ts`, `whatsapp.ts` —incluye descarga de media—, `meta-graph.ts`, …)
- **Jobs**: `jobs/seguimientos.ts`
- **Prisma**: `prisma/schema.prisma`, `prisma/seed.ts`

---

*Documento generado para handoff operativo. Si el comportamiento en runtime difiere (por ejemplo tras un deploy con variables distintas), la fuente de verdad siguen siendo el entorno y la base de datos.*
