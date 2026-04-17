import { waitUntil } from "@vercel/functions";

/**
 * En Vercel, el runtime puede congelar la función en cuanto se envía la respuesta HTTP.
 * `waitUntil` mantiene viva la invocación hasta que la promesa termine (webhooks que responden 200 rápido).
 * Fuera de Vercel, `waitUntil` no hace tracking; la promesa igual sigue ejecutándose en Node.
 */
export function scheduleAfterResponse(task: Promise<unknown>): void {
  waitUntil(task);
}
