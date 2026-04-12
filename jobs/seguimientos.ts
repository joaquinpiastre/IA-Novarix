import cron from "node-cron";
import { prisma } from "@/lib/db";
import {
  generarMensajeFollowUp,
  reemplazarVariables,
  encontrarContactosElegibles,
} from "@/lib/seguimientos";
import { moverContactoEtapa } from "@/lib/crm";
import { enviarMensajeWhatsApp } from "@/lib/whatsapp";

async function nombreEtapa(etapaId: string | null): Promise<string | null> {
  if (!etapaId) return null;
  const e = await prisma.etapaCRM.findUnique({ where: { id: etapaId }, select: { nombre: true } });
  return e?.nombre ?? null;
}

export async function ejecutarSeguimientosJob() {
  const reglas = await prisma.reglaFollowUp.findMany({
    where: { activa: true },
    include: { empresa: true },
  });

  for (const regla of reglas) {
    const contactos = await encontrarContactosElegibles(regla.id);

    for (const contacto of contactos) {
      try {
        const etapaNom = await nombreEtapa(contacto.etapaId);
        const mensaje =
          regla.usarIA && regla.promptMensaje?.trim()
            ? await generarMensajeFollowUp(regla.promptMensaje, contacto, regla.empresa, etapaNom)
            : reemplazarVariables(regla.mensajeFijo || "", contacto, regla.empresa, etapaNom);

        const texto = mensaje.trim();
        if (!texto) continue;

        if (contacto.numero.startsWith("m:") || contacto.numero.startsWith("ig:")) {
          continue;
        }

        if (!regla.empresa.whatsappPhoneId || !regla.empresa.whatsappToken) {
          await prisma.seguimientoEnviado.create({
            data: {
              reglaId: regla.id,
              contactoId: contacto.id,
              mensaje: texto,
              estado: "ERROR",
            },
          });
          continue;
        }

        const res = await enviarMensajeWhatsApp({
          phoneNumberId: regla.empresa.whatsappPhoneId,
          accessToken: regla.empresa.whatsappToken,
          to: contacto.numero,
          text: texto,
        });
        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          console.error("[CRON] WhatsApp API error", res.status, errBody);
          await prisma.seguimientoEnviado.create({
            data: {
              reglaId: regla.id,
              contactoId: contacto.id,
              mensaje: texto,
              estado: "ERROR",
            },
          });
          continue;
        }

        await prisma.seguimientoEnviado.create({
          data: {
            reglaId: regla.id,
            contactoId: contacto.id,
            mensaje: texto,
            estado: "ENVIADO",
            enviadoEn: new Date(),
          },
        });

        if (regla.moverAEtapaId) {
          await moverContactoEtapa(contacto.id, regla.moverAEtapaId);
        }

        console.log(`[CRON] Seguimiento enviado a ${contacto.numero}`);
      } catch (error) {
        console.error(`[CRON] Error enviando a ${contacto.numero}:`, error);
        await prisma.seguimientoEnviado.create({
          data: {
            reglaId: regla.id,
            contactoId: contacto.id,
            mensaje: "",
            estado: "ERROR",
          },
        });
      }
    }
  }
}

let started = false;

export function iniciarCronSeguimientos() {
  if (started) return;
  started = true;
  if (process.env.DISABLE_CRM_CRON === "1") return;

  cron.schedule("*/30 * * * *", async () => {
    console.log("[CRON] Revisando seguimientos automáticos...");
    try {
      await ejecutarSeguimientosJob();
    } catch (e) {
      console.error("[CRON] Seguimientos falló", e);
    }
    console.log("[CRON] Seguimientos completados");
  });
}
