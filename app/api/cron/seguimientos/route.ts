import { NextResponse } from "next/server";
import { ejecutarSeguimientosJob } from "@/jobs/seguimientos";

/** Llamá desde cron externo (Vercel Cron, etc.) con header Authorization: Bearer <CRON_SECRET> */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    await ejecutarSeguimientosJob();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falló el job" }, { status: 500 });
  }
}
