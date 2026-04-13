import cron from "node-cron";
import type { CanalConversacion } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  generarMensajeFollowUp,
  reemplazarVariables,
  encontrarContactosElegibles,
} from "@/lib/seguimientos";
import { moverContactoEtapa } from "@/lib/crm";
import { enviarMensajeMessenger, enviarMensajeInstagram } from "@/lib/meta-graph";
import { enviarMensajeWhatsApp } from "@/lib/whatsapp";

function canalSeguimientoDesdeNumero(numero: string): CanalConversacion {
  if (numero.startsWith("ig:")) return "INSTAGRAM";
  if (numero.startsWith("m:")) return "MESSENGER";
  return "WHATSAPP";
}

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

        const empresa = regla.empresa;
        const canal = canalSeguimientoDesdeNumero(contacto.numero);
        let res: Response;

        if (canal === "INSTAGRAM") {
          const recipient = contacto.numero.slice(3).trim();
          if (!recipient || !empresa.metaPageToken || !empresa.metaInstagramId) {
            await prisma.seguimientoEnviado.create({
              data: {
                reglaId: regla.id,
                contactoId: contacto.id,
                mensaje: texto,
                estado: "ERROR",
                canal: "INSTAGRAM",
              },
            });
            continue;
          }
          res = await enviarMensajeInstagram(
            empresa.metaPageToken,
            empresa.metaInstagramId,
            recipient,
            texto
          );
        } else if (canal === "MESSENGER") {
          const recipient = contacto.numero.slice(2).trim();
          if (!recipient || !empresa.metaPageToken) {
            await prisma.seguimientoEnviado.create({
              data: {
                reglaId: regla.id,
                contactoId: contacto.id,
                mensaje: texto,
                estado: "ERROR",
                canal: "MESSENGER",
              },
            });
            continue;
          }
          res = await enviarMensajeMessenger(empresa.metaPageToken, recipient, texto);
        } else {
          if (!empresa.whatsappPhoneId || !empresa.whatsappToken) {
            await prisma.seguimientoEnviado.create({
              data: {
                reglaId: regla.id,
                contactoId: contacto.id,
                mensaje: texto,
                estado: "ERROR",
                canal: "WHATSAPP",
              },
            });
            continue;
          }
          res = await enviarMensajeWhatsApp({
            phoneNumberId: empresa.whatsappPhoneId,
            accessToken: empresa.whatsappToken,
            to: contacto.numero,
            text: texto,
          });
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          console.error("[CRON] envío seguimiento API error", canal, res.status, errBody);
          await prisma.seguimientoEnviado.create({
            data: {
              reglaId: regla.id,
              contactoId: contacto.id,
              mensaje: texto,
              estado: "ERROR",
              canal,
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
            canal,
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
            canal: canalSeguimientoDesdeNumero(contacto.numero),
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
