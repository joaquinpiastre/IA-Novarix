/**
 * Asegura que no quede el bug de tipos con j.archivo: Workspace tiene la lógica;
 * ConocimientoCliente.tsx solo re-exporta (shim).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dir = path.join(root, "components", "conocimiento");
const workspace = path.join(dir, "ConocimientoWorkspace.tsx");
const shim = path.join(dir, "ConocimientoCliente.tsx");

if (!fs.existsSync(workspace)) {
  console.error("[verify] Falta:", workspace);
  process.exit(1);
}

const ws = fs.readFileSync(workspace, "utf8");
if (ws.includes("j.archivo")) {
  console.error("[verify] ConocimientoWorkspace.tsx no debe contener j.archivo.");
  process.exit(1);
}
if (!ws.includes("catalogo-desde-web-client")) {
  console.error("[verify] ConocimientoWorkspace debe importar catalogo-desde-web-client.");
  process.exit(1);
}

if (!fs.existsSync(shim)) {
  console.error("[verify] Falta shim:", shim);
  process.exit(1);
}
const sh = fs.readFileSync(shim, "utf8");
if (sh.includes("j.archivo")) {
  console.error("[verify] ConocimientoCliente.tsx (shim) no debe contener j.archivo.");
  process.exit(1);
}
if (!sh.includes("ConocimientoWorkspace")) {
  console.error("[verify] ConocimientoCliente.tsx debe re-exportar desde ConocimientoWorkspace.");
  process.exit(1);
}
if (sh.includes("parseCatalogoDesdeWebJson") || sh.includes("useState")) {
  console.error("[verify] ConocimientoCliente.tsx debe ser solo re-export, sin lógica duplicada.");
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
    console.error("[verify] page.tsx debe importar desde @/components/conocimiento/ConocimientoCliente");
    process.exit(1);
  }
}

console.log("[verify] Conocimiento: shim + Workspace OK.");
