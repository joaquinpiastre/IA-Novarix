/**
 * Comprueba que ConocimientoCliente.tsx es la versión V3 (un solo archivo, sin patrón roto en import web).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const cliente = path.join(root, "components", "conocimiento", "ConocimientoCliente.tsx");
const workspace = path.join(root, "components", "conocimiento", "ConocimientoWorkspace.tsx");

if (fs.existsSync(workspace)) {
  console.error("[verify] Borrá ConocimientoWorkspace.tsx: la UI debe vivir solo en ConocimientoCliente.tsx.");
  process.exit(1);
}

if (!fs.existsSync(cliente)) {
  console.error("[verify] Falta:", cliente);
  process.exit(1);
}

const s = fs.readFileSync(cliente, "utf8");

if (!s.includes("NOVARIX_CONOCIMIENTO_MONOLITH_V3")) {
  console.error("[verify] ConocimientoCliente.tsx no tiene el marcador V3 (subí el último código).");
  process.exit(1);
}

if (s.includes("j.archivo")) {
  console.error("[verify] ConocimientoCliente.tsx no debe contener el patrón roto de tipos.");
  process.exit(1);
}

if (!s.includes("mensajeExitoImportacionWeb") || !s.includes("parseCatalogoDesdeWebJson")) {
  console.error("[verify] ConocimientoCliente.tsx debe usar lib/catalogo-desde-web-client.");
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
  if (!p.includes("@/components/conocimiento/ConocimientoCliente")) {
    console.error("[verify] page.tsx debe importar @/components/conocimiento/ConocimientoCliente");
    process.exit(1);
  }
}

console.log("[verify] ConocimientoCliente monolito V3 OK.");
