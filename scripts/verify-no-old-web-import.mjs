/**
 * Falla el build si volvió el patrón viejo (Vercel mostraba error en j.archivo).
 * Corré: node scripts/verify-no-old-web-import.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const p = path.join(root, "components", "conocimiento", "ConocimientoCliente.tsx");

if (!fs.existsSync(p)) {
  console.error("[verify] No existe:", p);
  process.exit(1);
}

const s = fs.readFileSync(p, "utf8");

if (s.includes("j.archivo")) {
  console.error("[verify] ConocimientoCliente.tsx todavía usa j.archivo (código viejo).");
  process.exit(1);
}

if (!s.includes("catalogo-desde-web-client")) {
  console.error("[verify] Falta import de @/lib/catalogo-desde-web-client en ConocimientoCliente.tsx");
  process.exit(1);
}

const lib = path.join(root, "lib", "catalogo-desde-web-client.ts");
if (!fs.existsSync(lib)) {
  console.error("[verify] Falta el archivo:", lib);
  process.exit(1);
}

console.log("[verify] Import web OK (sin j.archivo, con lib).");
