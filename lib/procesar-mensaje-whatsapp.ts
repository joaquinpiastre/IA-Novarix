import type { AtencionHumanaEstado, Agente, CanalConversacion, Empresa, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calcularCreditos } from "@/lib/creditos";
import {
  construirSystemPrompt,
  generarRespuestaAgente,
  transcribirAudioWhisper,
  analizarImagenVision,
} from "@/lib/openai";
import { descargarMediaWhatsApp, enviarMensajeWhatsApp } from "@/lib/whatsapp";
import { obtenerTextoCatalogoExterno } from "@/lib/stock-api";
import { obtenerOCrearContacto } from "@/lib/crm";

export type WhatsAppInboundMessage = {
  type?: string;
  from?: string;
  text?: { body?: string };
  audio?: { id?: string };
  image?: { id?: string; caption?: string };
  document?: { filename?: string };
  video?: unknown;
  sticker?: unknown;
  location?: { latitude?: number; longitude?: number };
  contacts?: unknown;
};

type MsgTipo = "text" | "audio" | "image" | "fallback";

type Msg = {
  role: "user" | "assistant";
  content: string;
  tipo?: MsgTipo;
  timestamp?: string;
};

function isoNow(): string {
  return new Date().toISOString();
}

function visionHabilitado(): boolean {
  return process.env.ENABLE_VISION !== "false";
}

function audioHabilitado(): boolean {
  return process.env.ENABLE_AUDIO !== "false";
}

type ResueltoInbound = {
  texto: string;
  tipo: MsgTipo;
  notaInterna?: string;
  /** Créditos extra (Whisper / Vision) antes del turno principal del agente */
  creditosPrevia: number;
};

async function resolverTextoDelMensaje(
  mensaje: WhatsAppInboundMessage,
  empresa: Empresa,
  agente: Agente
): Promise<ResueltoInbound> {
  const tipo = mensaje.type;

  if (tipo === "text") {
    return {
      texto: mensaje.text?.body ?? "",
      tipo: "text",
      creditosPrevia: 0,
    };
  }

  if (tipo === "audio") {
    if (!audioHabilitado()) {
      return {
        texto:
          "Recibí tu audio pero el procesamiento de audios no está disponible ahora. ¿Podés escribirme tu consulta?",
        tipo: "fallback",
        notaInterna: "ENABLE_AUDIO desactivado",
        creditosPrevia: 0,
      };
    }
    try {
      const mediaId = mensaje.audio?.id;
      if (!mediaId || !empresa.whatsappToken) {
        throw new Error("Falta mediaId o token de WhatsApp");
      }

      const { buffer, mimeType, extension } = await descargarMediaWhatsApp(mediaId, empresa.whatsappToken);

      const { texto: transcripcion, durationSec } = await transcribirAudioWhisper(buffer, mimeType, extension);

      const creditosWhisper = Math.max(0.25, (durationSec / 60) * 2);

      if (!transcripcion || transcripcion.length < 2) {
        return {
          texto: "El cliente envió un audio pero no se pudo escuchar bien.",
          tipo: "audio",
          notaInterna: "Audio sin contenido detectable",
          creditosPrevia: creditosWhisper,
        };
      }

      return {
        texto: `[El cliente envió un audio. Transcripción: "${transcripcion}"]`,
        tipo: "audio",
        notaInterna: `Audio transcripto: ${transcripcion}`,
        creditosPrevia: creditosWhisper,
      };
    } catch (error) {
      console.error("[WhatsApp][debug][Audio] catch", error);
      return {
        texto:
          "Recibí tu audio pero tuve un problema para escucharlo. ¿Podés escribirme tu consulta?",
        tipo: "fallback",
        notaInterna: `Error procesando audio: ${String(error)}`,
        creditosPrevia: 0,
      };
    }
  }

  if (tipo === "image") {
    if (!visionHabilitado()) {
      return {
        texto:
          "Recibí tu imagen pero el análisis de imágenes no está disponible ahora. ¿Podés describirme qué necesitás?",
        tipo: "fallback",
        notaInterna: "ENABLE_VISION desactivado",
        creditosPrevia: 0,
      };
    }
    try {
      const mediaId = mensaje.image?.id;
      const captionDelCliente = mensaje.image?.caption?.trim() ?? "";

      if (!mediaId || !empresa.whatsappToken) {
        throw new Error("Falta mediaId o token de WhatsApp");
      }

      const { buffer, mimeType } = await descargarMediaWhatsApp(mediaId, empresa.whatsappToken);

      const limiteMB = 5;
      if (buffer.length > limiteMB * 1024 * 1024) {
        return {
          texto:
            "La imagen que mandaste es muy grande para procesarla. ¿Podés mandarla más comprimida o describir qué necesitás?",
          tipo: "fallback",
          notaInterna: "Imagen demasiado grande",
          creditosPrevia: 0,
        };
      }

      const promptDelAgente = agente.prompt?.trim() || "Sos un asistente de atención al cliente.";
      const { descripcion, exito, tokensTotal } = await analizarImagenVision(buffer, mimeType, promptDelAgente);
      const creditosVision = calcularCreditos(tokensTotal);

      const contextoCompleto = captionDelCliente
        ? `[El cliente envió una imagen con el mensaje: "${captionDelCliente}". Lo que muestra la imagen: ${descripcion}]`
        : `[El cliente envió una imagen. Lo que muestra: ${descripcion}]`;

      return {
        texto: contextoCompleto,
        tipo: "image",
        notaInterna: exito ? `Imagen analizada: ${descripcion.slice(0, 100)}…` : "Imagen sin análisis completo",
        creditosPrevia: creditosVision,
      };
    } catch (error) {
      console.error("[WhatsApp][debug][Imagen] catch", error);
      return {
        texto:
          "Recibí tu imagen pero no pude verla correctamente. ¿Podés describirme qué necesitás o mandarla de otra forma?",
        tipo: "fallback",
        notaInterna: `Error procesando imagen: ${String(error)}`,
        creditosPrevia: 0,
      };
    }
  }

  if (tipo === "document") {
    const nombreArchivo = mensaje.document?.filename || "documento";
    return {
      texto: `El cliente envió un documento llamado "${nombreArchivo}". Por ahora no puedo leer documentos. ¿En qué te puedo ayudar?`,
      tipo: "fallback",
      notaInterna: `Documento recibido: ${nombreArchivo}`,
      creditosPrevia: 0,
    };
  }

  if (tipo === "video") {
    return {
      texto:
        "Recibí tu video, pero por ahora no puedo procesarlos. ¿Podés contarme qué necesitás por texto o con una foto?",
      tipo: "fallback",
      notaInterna: "Video recibido — no soportado",
      creditosPrevia: 0,
    };
  }

  if (tipo === "sticker") {
    return {
      texto: "¡Hola! ¿En qué te puedo ayudar hoy?",
      tipo: "fallback",
      notaInterna: "Sticker recibido",
      creditosPrevia: 0,
    };
  }

  if (tipo === "location") {
    const lat = mensaje.location?.latitude;
    const lon = mensaje.location?.longitude;
    return {
      texto: `El cliente compartió su ubicación (${lat}, ${lon}). ¿Necesitás información sobre envíos o cobertura en tu zona?`,
      tipo: "fallback",
      notaInterna: `Ubicación compartida: ${lat}, ${lon}`,
      creditosPrevia: 0,
    };
  }

  if (tipo === "contacts") {
    return {
      texto: "Recibí un contacto. ¿En qué te puedo ayudar?",
      tipo: "fallback",
      notaInterna: "Contacto recibido",
      creditosPrevia: 0,
    };
  }

  return {
    texto:
      "Recibí tu mensaje. Por el momento solo puedo responder texto, audio e imágenes. ¿Cómo te puedo ayudar?",
    tipo: "fallback",
    notaInterna: `Tipo de mensaje no soportado: ${String(tipo)}`,
    creditosPrevia: 0,
  };
}

function colaHumanaBloqueaIa(conv: {
  estado: string;
  atencionHumana: AtencionHumanaEstado;
}): boolean {
  if (conv.atencionHumana === "ACTIVA") return true;
  if (conv.estado === "DERIVADA_HUMANO" && conv.atencionHumana === "NINGUNA") return true;
  return false;
}

function conversacionBloqueaIa(conv: {
  iaHabilitada: boolean;
  estado: string;
  atencionHumana: AtencionHumanaEstado;
}): boolean {
  if (!conv.iaHabilitada) return true;
  return colaHumanaBloqueaIa({ estado: conv.estado, atencionHumana: conv.atencionHumana });
}

/** Loguea fallos de Prisma (p. ej. timeout del pool en serverless) y relanza. */
async function prismaCall<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[WhatsApp][debug][Prisma] ${operation}`, err);
    throw err;
  }
}

export async function procesarMensajeWhatsApp(input: {
  numeroCliente: string;
  phoneNumberId: string;
  esGrupo: boolean;
  nombreCliente?: string | null;
  mensaje: WhatsAppInboundMessage;
}): Promise<void> {
  try {
    await runProcesarMensajeWhatsApp(input);
  } catch (err) {
    console.error("[WhatsApp][debug] excepción no manejada en runProcesarMensajeWhatsApp", err);
  }
}

async function runProcesarMensajeWhatsApp(input: {
  numeroCliente: string;
  phoneNumberId: string;
  esGrupo: boolean;
  nombreCliente?: string | null;
  mensaje: WhatsAppInboundMessage;
}): Promise<void> {
  console.error("[WhatsApp][debug] inicio runProcesarMensajeWhatsApp", {
    phoneNumberId: input.phoneNumberId,
    from: input.numeroCliente,
    tipo: input.mensaje?.type,
  });

  const empresa = await prismaCall("empresa.findFirst", () =>
    prisma.empresa.findFirst({
      where: { whatsappPhoneId: input.phoneNumberId, activo: true },
    })
  );
  if (!empresa?.whatsappToken) {
    console.error("[WhatsApp][debug] abort: empresa no encontrada o sin whatsappToken", {
      phoneNumberId: input.phoneNumberId,
      empresaId: empresa?.id ?? null,
      tieneToken: !!empresa?.whatsappToken,
    });
    return;
  }
  console.error("[WhatsApp][debug] empresa OK", {
    empresaId: empresa.id,
    nombre: empresa.nombre,
    phoneIdCoincide: empresa.whatsappPhoneId === input.phoneNumberId,
  });

  const contacto = await prismaCall("obtenerOCrearContacto", () =>
    obtenerOCrearContacto(empresa.id, input.numeroCliente, input.nombreCliente, "WHATSAPP")
  );

  const agente =
    (await prismaCall("agente.findFirst (esDefault)", () =>
      prisma.agente.findFirst({
        where: { empresaId: empresa.id, activo: true, esDefault: true },
      })
    )) ??
    (await prismaCall("agente.findFirst (cualquier activo)", () =>
      prisma.agente.findFirst({
        where: { empresaId: empresa.id, activo: true },
      })
    ));
  if (!agente) {
    console.error("[WhatsApp][debug] abort: sin agente activo para la empresa", { empresaId: empresa.id });
    return;
  }
  console.error("[WhatsApp][debug] agente OK", {
    agenteId: agente.id,
    nombre: agente.nombre,
    esDefault: agente.esDefault,
    activo: agente.activo,
  });

  const resolved = await resolverTextoDelMensaje(input.mensaje, empresa, agente);
  const textoDelCliente = resolved.texto;
  const tipoMensaje = resolved.tipo;
  const ts = isoNow();

  if (tipoMensaje === "text" && !textoDelCliente.trim()) {
    console.error("[WhatsApp][debug] abort: mensaje de texto vacío tras resolver");
    return;
  }

  const canalWa: CanalConversacion = "WHATSAPP";
  const convPrev = await prismaCall("conversacion.findFirst", () =>
    prisma.conversacion.findFirst({
      where: { empresaId: empresa.id, numeroCliente: input.numeroCliente, canal: canalWa },
      orderBy: { ultimoMensaje: "desc" },
    })
  );

  const mensajesPrev = (convPrev?.mensajes as Msg[] | null) ?? [];

  const skipOpenAi = tipoMensaje === "fallback";

  let convId: string;
  const now = new Date();

  if (skipOpenAi) {
    const bloquearInicial = convPrev ? conversacionBloqueaIa(convPrev) : false;
    const sinRespuestaAuto = bloquearInicial || empresa.chatIaPausado;
    const userContent = `[FALLBACK] ${resolved.notaInterna ?? "Mensaje no soportado"}`;
    const userTurn: Msg[] = sinRespuestaAuto
      ? [...mensajesPrev, { role: "user", content: userContent, tipo: "fallback", timestamp: ts }]
      : [
          ...mensajesPrev,
          { role: "user", content: userContent, tipo: "fallback", timestamp: ts },
          { role: "assistant", content: textoDelCliente, tipo: "fallback", timestamp: ts },
        ];

    if (!convPrev) {
      const c = await prismaCall("conversacion.create (fallback)", () =>
        prisma.conversacion.create({
          data: {
            empresaId: empresa.id,
            agenteId: agente.id,
            numeroCliente: input.numeroCliente,
            nombreCliente: input.nombreCliente?.trim() || null,
            esGrupo: input.esGrupo,
            canal: canalWa,
            contactoId: contacto.id,
            mensajes: userTurn as unknown as Prisma.InputJsonValue,
            ultimoMensaje: now,
          },
        })
      );
      convId = c.id;
    } else {
      const reopenEstado =
        convPrev.atencionHumana === "RESUELTA"
          ? ({ atencionHumana: "NINGUNA" as const, estado: "ACTIVA" as const } as const)
          : convPrev.estado === "RESUELTA"
            ? ({ estado: "ACTIVA" as const } as const)
            : ({} as const);
      await prismaCall("conversacion.update (fallback)", () =>
        prisma.conversacion.update({
          where: { id: convPrev.id },
          data: {
            ...reopenEstado,
            mensajes: userTurn as unknown as Prisma.InputJsonValue,
            ultimoMensaje: now,
            esGrupo: input.esGrupo || convPrev.esGrupo,
            contactoId: contacto.id,
            ...(input.nombreCliente?.trim() ? { nombreCliente: input.nombreCliente.trim() } : {}),
          },
        })
      );
      convId = convPrev.id;
    }

    if (!sinRespuestaAuto && empresa.whatsappPhoneId) {
      try {
        await enviarMensajeWhatsApp({
          phoneNumberId: input.phoneNumberId,
          accessToken: empresa.whatsappToken,
          to: input.numeroCliente,
          text: textoDelCliente,
        });
      } catch (err) {
        console.error("[WhatsApp][debug] enviarMensajeWhatsApp (rama fallback) catch", err);
      }
    }

    if (resolved.creditosPrevia > 0) {
      await prismaCall("empresa.update creditos (fallback previa)", () =>
        prisma.empresa.update({
          where: { id: empresa.id },
          data: { creditosUsados: { increment: resolved.creditosPrevia } },
        })
      );
      await prismaCall("conversacion.update creditos (fallback previa)", () =>
        prisma.conversacion.update({
          where: { id: convId },
          data: { creditosUsados: { increment: resolved.creditosPrevia } },
        })
      );
    }

    console.error("[WhatsApp][debug] fin rama fallback (skipOpenAi), sin llamar OpenAI en esta rama");
    return;
  }

  /** Solo user antes de OpenAI (mismo patrón que texto) */
  const userMsg: Msg = {
    role: "user",
    content: textoDelCliente,
    tipo: tipoMensaje,
    timestamp: ts,
  };
  const userTurn: Msg[] = [...mensajesPrev, userMsg];

  if (!convPrev) {
    const c = await prismaCall("conversacion.create", () =>
      prisma.conversacion.create({
        data: {
          empresaId: empresa.id,
          agenteId: agente.id,
          numeroCliente: input.numeroCliente,
          nombreCliente: input.nombreCliente?.trim() || null,
          esGrupo: input.esGrupo,
          canal: canalWa,
          contactoId: contacto.id,
          mensajes: userTurn as unknown as Prisma.InputJsonValue,
          ultimoMensaje: now,
        },
      })
    );
    convId = c.id;
  } else {
    const reopenEstado =
      convPrev.atencionHumana === "RESUELTA"
        ? ({ atencionHumana: "NINGUNA" as const, estado: "ACTIVA" as const } as const)
        : convPrev.estado === "RESUELTA"
          ? ({ estado: "ACTIVA" as const } as const)
          : ({} as const);
    await prismaCall("conversacion.update (userTurn)", () =>
      prisma.conversacion.update({
        where: { id: convPrev.id },
        data: {
          ...reopenEstado,
          mensajes: userTurn as unknown as Prisma.InputJsonValue,
          ultimoMensaje: now,
          esGrupo: input.esGrupo || convPrev.esGrupo,
          contactoId: contacto.id,
          ...(input.nombreCliente?.trim() ? { nombreCliente: input.nombreCliente.trim() } : {}),
        },
      })
    );
    convId = convPrev.id;
  }

  const conv = await prismaCall("conversacion.findUniqueOrThrow", () =>
    prisma.conversacion.findUniqueOrThrow({ where: { id: convId } })
  );

  if (empresa.chatIaPausado) {
    console.error("[WhatsApp][debug] abort: chatIaPausado en empresa", { empresaId: empresa.id });
    return;
  }

  const bloquear =
    conv.iaHabilitada === false ||
    colaHumanaBloqueaIa({ estado: conv.estado, atencionHumana: conv.atencionHumana });

  if (bloquear) {
    console.error("[WhatsApp][debug] abort: conversación bloquea IA", {
      convId: conv.id,
      iaHabilitada: conv.iaHabilitada,
      estado: conv.estado,
      atencionHumana: conv.atencionHumana,
    });
    return;
  }

  const archivos = await prismaCall("archivoConocimiento.findMany", () =>
    prisma.archivoConocimiento.findMany({
      where: {
        empresaId: empresa.id,
        OR: [{ agenteId: agente.id }, { agenteId: null }],
      },
    })
  );
  const desdeArchivos = archivos.map((a) => (a.contenido ? a.contenido : `[${a.nombre}]`)).join("\n\n");
  let desdeErp = "";
  if (agente.busquedaProductos !== false) {
    try {
      desdeErp = await obtenerTextoCatalogoExterno(empresa);
    } catch (err) {
      console.error("[WhatsApp][debug] obtenerTextoCatalogoExterno catch", err);
    }
  }
  const conocimiento = [desdeArchivos, desdeErp].filter(Boolean).join("\n\n");

  const systemPrompt = construirSystemPrompt(agente, conocimiento, empresa.nombre);

  const historial: Msg[] = mensajesPrev.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let texto: string;
  let tokensTotal: number;
  try {
    console.error("[WhatsApp][debug] llamando OpenAI (generarRespuestaAgente)", {
      agenteId: agente.id,
      modelo: agente.modeloOpenai,
      charsUsuario: textoDelCliente.length,
      charsConocimiento: conocimiento.length,
    });
    const r = await generarRespuestaAgente({
      systemPrompt,
      historial,
      mensajeUsuario: textoDelCliente,
      model: agente.modeloOpenai,
      temperature: agente.temperatura,
      maxTokens: agente.maxTokens,
    });
    texto = r.texto;
    tokensTotal = r.tokensTotal;
    console.error("[WhatsApp][debug] OpenAI OK", { tokensTotal, charsRespuesta: texto.length });
  } catch (e) {
    console.error("[WhatsApp][debug] OpenAI generarRespuestaAgente catch", e);
    texto =
      "Disculpá, ahora no puedo responder. Probá de nuevo en unos minutos o pedí hablar con un asesor.";
    tokensTotal = 0;
  }

  const creditosAgente = calcularCreditos(tokensTotal);
  const creditosPrevia = resolved.creditosPrevia;
  const creditosDelta = creditosAgente + creditosPrevia;

  const nuevos: Msg[] = [
    ...mensajesPrev,
    { role: "user", content: textoDelCliente, tipo: tipoMensaje, timestamp: ts },
    { role: "assistant", content: texto },
  ];

  await prismaCall("conversacion.update (respuesta IA)", () =>
    prisma.conversacion.update({
      where: { id: convId },
      data: {
        mensajes: nuevos as unknown as Prisma.InputJsonValue,
        tokensUsados: { increment: tokensTotal },
        creditosUsados: { increment: creditosDelta },
        ultimoMensaje: new Date(),
        agenteId: agente.id,
      },
    })
  );

  if (creditosDelta > 0) {
    await prismaCall("empresa.update creditos (post IA)", () =>
      prisma.empresa.update({
        where: { id: empresa.id },
        data: { creditosUsados: { increment: creditosDelta } },
      })
    );
  }

  try {
    await enviarMensajeWhatsApp({
      phoneNumberId: input.phoneNumberId,
      accessToken: empresa.whatsappToken,
      to: input.numeroCliente,
      text: texto,
    });
    console.error("[WhatsApp][debug] enviarMensajeWhatsApp (respuesta IA) OK");
  } catch (err) {
    console.error("[WhatsApp][debug] enviarMensajeWhatsApp (respuesta IA) catch", err);
  }
}
