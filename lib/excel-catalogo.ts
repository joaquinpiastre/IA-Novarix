import * as XLSX from "xlsx";

const MAX_CHARS = 200_000;

/** Convierte todas las hojas del libro a texto tipo CSV (legible por humanos y por la IA). */
export function excelBufferToTextoCatalogo(buf: Buffer): string {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const csv = XLSX.utils.sheet_to_csv(ws, { FS: "\t" });
    if (csv.trim()) {
      parts.push(`## Hoja: ${sheetName}\n${csv}`);
    }
  }
  const t = parts.join("\n\n");
  if (!t.trim()) return "(Excel sin datos legibles en las hojas)";
  return t.length > MAX_CHARS ? `${t.slice(0, MAX_CHARS)}\n…(truncado)` : t;
}
