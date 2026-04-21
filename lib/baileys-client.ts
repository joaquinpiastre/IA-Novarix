import fs from "fs";
import path from "path";
import pino from "pino";
import makeWASocket, {
  delay,
  DisconnectReason,
  useMultiFileAuthState as createAuthState,
  type WAMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { prisma } from "@/lib/db";
import { construirSystemPrompt, generarRespuestaAgente } from "@/lib/openai";
import { obtenerOCrearContacto } from "@/lib/crm";

type MensajeChat = { role: "user" | "assistant"; content: string };

const logger = pino({ level: "silent" });
const sesionesActivas = new Map<string, ReturnType<typeof makeWASocket>>();

function extraerTexto(message: WAMessage): string {
  return (
    message.message?.conversation ??
    message.message?.extendedTextMessage?.text ??
    message.message?.imageMessage?.caption ??
    ""
  ).trim();
}

async function responderMensaje(empresaId: string, message: WAMessage) {
  const jid = message.key.remoteJid;
  if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") return;
  const texto = extraerTexto(message);
  if (!texto) return;

  const numeroCliente = jid.replace("@s.whatsapp.net", "");
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return;

  const agente =
    (await prisma.agente.findFirst({
      where: { empresaId, activo: true, esDefault: true },
    })) ??
    (await prisma.agente.findFirst({
      where: { empresaId, activo: true },
    }));
  if (!agente) return;

  const contacto = await obtenerOCrearContacto(empresaId, numeroCliente, null, "WHATSAPP");
  const canal = "WHATSAPP" as const;
  const convPrev = await prisma.conversacion.findFirst({
    where: { empresaId, numeroCliente, canal },
    orderBy: { ultimoMensaje: "desc" },
  });
  const mensajesPrev = ((convPrev?.mensajes as MensajeChat[] | null) ?? []).slice(-10);
  const historial = mensajesPrev.map((m) => ({ role: m.role, content: m.content }));
  const conocimiento = "";
  const systemPrompt = construirSystemPrompt(agente, conocimiento, empresa.nombre);
  const { texto: respuesta, tokensTotal } = await generarRespuestaAgente({
    systemPrompt,
    historial,
    mensajeUsuario: texto,
    model: agente.modeloOpenai,
    temperature: agente.temperatura,
    maxTokens: agente.maxTokens,
  });
  if (!respuesta) return;

  const nuevosMensajes: MensajeChat[] = [
    ...mensajesPrev,
    { role: "user", content: texto },
    { role: "assistant", content: respuesta },
  ];
  if (!convPrev) {
    await prisma.conversacion.create({
      data: {
        empresaId,
        agenteId: agente.id,
        numeroCliente,
        contactoId: contacto.id,
        canal,
        mensajes: nuevosMensajes,
        ultimoMensaje: new Date(),
      },
    });
  } else {
    await prisma.conversacion.update({
      where: { id: convPrev.id },
      data: {
        mensajes: nuevosMensajes,
        ultimoMensaje: new Date(),
        tokensUsados: { increment: tokensTotal },
      },
    });
  }

  await enviarMensaje(empresaId, numeroCliente, respuesta);
}

export async function iniciarConexion(empresaId: string, onQR: (qr: string) => void) {
  const existente = sesionesActivas.get(empresaId);
  if (existente) return existente;

  const authDir = path.join(process.cwd(), "whatsapp-sessions", empresaId);
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  const { state, saveCreds } = await createAuthState(authDir);

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["Novarix", "Chrome", "120.0.0"],
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
  });
  sesionesActivas.set(empresaId, sock);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      onQR(qr);
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { whatsappQRCode: qr, whatsappQRConectado: false, whatsappTipo: "qr" },
      });
    }

    if (connection === "open") {
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { whatsappQRConectado: true, whatsappQRCode: null, whatsappTipo: "qr" },
      });
    }

    if (connection === "close") {
      sesionesActivas.delete(empresaId);
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { whatsappQRConectado: false },
      });
      const shouldReconnect =
        (lastDisconnect?.error as Boom | undefined)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        await delay(5000);
        await iniciarConexion(empresaId, onQR);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      if (message.key.fromMe) continue;
      try {
        await responderMensaje(empresaId, message);
      } catch (error) {
        console.error("[baileys] error procesando mensaje", error);
      }
    }
  });

  return sock;
}

export async function enviarMensaje(empresaId: string, numero: string, texto: string) {
  const sock = sesionesActivas.get(empresaId);
  if (!sock) throw new Error("No hay conexion activa de WhatsApp QR");

  const jid = numero.includes("@") ? numero : `${numero.replace(/\D/g, "")}@s.whatsapp.net`;
  await delay(1000 + Math.random() * 2000);
  await sock.sendPresenceUpdate("composing", jid);
  const typingDelay = Math.min(Math.max(texto.length * 35, 1200), 6000) + Math.random() * 800;
  await delay(typingDelay);
  await sock.sendPresenceUpdate("paused", jid);
  await sock.sendMessage(jid, { text: texto });
}

export async function cerrarConexion(empresaId: string) {
  const sock = sesionesActivas.get(empresaId);
  if (!sock) return;
  await sock.logout();
  sesionesActivas.delete(empresaId);
  await prisma.empresa.update({
    where: { id: empresaId },
    data: { whatsappQRConectado: false, whatsappQRCode: null },
  });
}
