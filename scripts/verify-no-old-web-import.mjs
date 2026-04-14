/**
 * Falla si el código de import web volvió al patrón viejo (j.archivo) o falta el módulo nuevo.
 * Tras renombrar el componente, también exige que NO exista el .tsx viejo (evita builds con dos fuentes).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const conocimientoDir = path.join(root, "components", "conocimiento");
const nuevo = path.join(conocimientoDir, "ConocimientoWorkspace.tsx");
const viejo = path.join(conocimientoDir, "ConocimientoCliente.tsx");

if (fs.existsSync(viejo)) {
  console.error("[verify] Existe todavía ConocimientoCliente.tsx — borrálo y usá solo ConocimientoWorkspace.tsx.");
  process.exit(1);
}

if (!fs.existsSync(nuevo)) {
  console.error("[verify] Falta:", nuevo);
  process.exit(1);
}

const s = fs.readFileSync(nuevo, "utf8");

if (s.includes("j.archivo")) {
  console.error("[verify] ConocimientoWorkspace.tsx contiene j.archivo (código viejo).");
  process.exit(1);
}

if (!s.includes("catalogo-desde-web-client")) {
  console.error("[verify] Falta import de @/lib/catalogo-desde-web-client.");
  process.exit(1);
}

const lib = path.join(root, "lib", "catalogo-desde-web-client.ts");
if (!fs.existsSync(lib)) {
  console.error("[verify] Falta:", lib);
  process.exit(1);
}

const page = path.join(root, "app", "(dashboard)", "conocimiento", "page.tsx");
if (fs.existsSync(page)) {
  const p = fs.readFileSync(page, "utf8");
  if (p.includes("ConocimientoCliente.tsx") || p.includes("/ConocimientoCliente\"")) {
    console.error("[verify] page.tsx sigue importando la ruta vieja ConocimientoCliente.");
    process.exit(1);
  }
  if (!p.includes("ConocimientoWorkspace")) {
    console.error("[verify] page.tsx debe importar ConocimientoWorkspace.");
    process.exit(1);
  }
}

console.log("[verify] Conocimiento web OK (Workspace, sin archivo viejo).");
