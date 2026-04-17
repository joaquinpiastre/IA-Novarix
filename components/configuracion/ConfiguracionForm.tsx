"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ConfiguracionForm() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [token, setToken] = useState("");
  const [verify, setVerify] = useState("");
  const [numero, setNumero] = useState("");
  const [stockUrl, setStockUrl] = useState("");
  const [stockToken, setStockToken] = useState("");
  const [stockHeader, setStockHeader] = useState("");
  const [cotizacionIncluyeGrupos, setCotizacionIncluyeGrupos] = useState(true);
  const [chatIaPausado, setChatIaPausado] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/empresa");
      if (r.ok) {
        const e = await r.json();
        setNombre(e.nombre ?? "");
        setEmail(e.email ?? "");
        setPhoneId(e.whatsappPhoneId ?? "");
        setVerify(e.whatsappVerifyToken ?? "");
        setNumero(e.whatsappNumero ?? "");
        setToken("");
        setStockUrl(e.stockApiUrl ?? "");
        setStockHeader(e.stockApiKeyHeader ?? "");
        setStockToken("");
        setCotizacionIncluyeGrupos(e.cotizacionIncluyeGrupos !== false);
        setChatIaPausado(e.chatIaPausado === true);
      }
      setLoading(false);
    })();
  }, []);

  async function guardarDatosEmpresa(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    setMsg(r.ok ? "Guardado." : "Error al guardar.");
  }

  async function guardarWhatsAppConfig(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whatsappPhoneId: phoneId || null,
        whatsappToken: token || undefined,
        whatsappVerifyToken: verify || null,
        whatsappNumero: numero || null,
      }),
    });
    if (r.ok) {
      setMsg("WhatsApp guardado.");
      window.alert(
        "WhatsApp Business guardado en Novarix.\n\nEn Meta, configurá el webhook con la URL pública de la plataforma y el mismo «Webhook Verify Token» que cargaste acá. Después usá «Probar conexión» para confirmar que el envío funciona."
      );
    } else {
      setMsg("Error al guardar WhatsApp.");
      window.alert("No se pudo guardar la configuración de WhatsApp. Revisá los datos e intentá de nuevo.");
    }
  }

  async function guardarChatIaPausado(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatIaPausado }),
    });
    setMsg(r.ok ? (chatIaPausado ? "IA pausada: no se enviarán respuestas automáticas." : "IA activa: el chat vuelve a responder.") : "Error al guardar.");
  }

  async function guardarCotizacionPreferencias(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotizacionIncluyeGrupos }),
    });
    setMsg(r.ok ? "Preferencias de cotización guardadas." : "Error al guardar.");
  }

  async function guardarStockApi(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockApiUrl: stockUrl.trim() || null,
        stockApiKeyHeader: stockHeader.trim() || null,
        stockApiToken: stockToken || undefined,
      }),
    });
    setMsg(r.ok ? "Integración de stock guardada." : "Error al guardar.");
  }

  async function probarStockApi() {
    setMsg("");
    const r = await fetch("/api/empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "probar-stock-api" }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.preview) {
      setMsg(`OK · ${j.totalChars} caracteres. Vista previa:\n${j.preview}${j.totalChars > 1200 ? "…" : ""}`);
    } else {
      setMsg(j.error ?? "No se pudo leer la API.");
    }
  }

  async function probarWhatsApp() {
    setMsg("");
    const r = await fetch("/api/empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "probar-whatsapp" }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const okText =
        "Conexión exitosa: Novarix envió un mensaje de prueba al número configurado. Revisá WhatsApp.";
      setMsg(okText);
      window.alert("Conexión exitosa\n\n" + okText);
    } else {
      const err = typeof j.error === "string" ? j.error : "No se pudo enviar el mensaje de prueba.";
      setMsg("Conexión fallida: " + err);
      window.alert("Conexión fallida\n\n" + err);
    }
  }

  async function cambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const r = await fetch("/api/empresa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-password", actual, nueva }),
    });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Contraseña actualizada." : j.error ?? "Error.");
    if (r.ok) {
      setActual("");
      setNueva("");
    }
  }

  if (loading) return <p className="text-[#7C6FAE]">Cargando…</p>;

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Datos de la empresa</h2>
        <form onSubmit={guardarDatosEmpresa} className="space-y-4">
          <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <Input label="Email" value={email} disabled className="opacity-60" />
          <p className="text-xs text-[#7C6FAE]">El email no se puede cambiar desde acá.</p>
          <Button type="submit">Guardar datos</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Pausar respuestas de la IA</h2>
        <p className="mb-4 text-sm leading-relaxed text-[#C4B5FD]">
          Activá esta opción si querés hacer cambios o si algo falla: los mensajes de clientes se siguen
          guardando en conversaciones, pero <strong className="text-white">no</strong> se llama a la IA ni
          se envían respuestas por WhatsApp, Messenger ni Instagram. El endpoint de prueba de IA también queda
          bloqueado.
        </p>
        <form onSubmit={guardarChatIaPausado} className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#C4B5FD]">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-[#7B2FF7]/40"
              checked={chatIaPausado}
              onChange={(e) => setChatIaPausado(e.target.checked)}
            />
            <span>Pausar chat con IA (empresa completa)</span>
          </label>
          <Button type="submit">{chatIaPausado ? "Guardar (quedará pausado)" : "Guardar (quedará activo)"}</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">WhatsApp Business (Meta)</h2>
        <form onSubmit={guardarWhatsAppConfig} className="space-y-4">
          <Input
            label="Phone Number ID"
            value={phoneId}
            onChange={(e) => setPhoneId(e.target.value)}
            placeholder="ID del número en Meta"
          />
          <Input
            label="Access Token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Dejá vacío para no cambiar el guardado"
          />
          <Input
            label="Webhook Verify Token"
            value={verify}
            onChange={(e) => setVerify(e.target.value)}
            placeholder="Token que configuraste en Meta"
          />
          <Input
            label="Número de prueba (con código país)"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="549..."
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Guardar WhatsApp</Button>
            <Button type="button" variant="secondary" onClick={() => void probarWhatsApp()}>
              Probar conexión
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Cotizaciones y chats</h2>
        <p className="mb-4 text-sm leading-relaxed text-[#C4B5FD]">
          Cuando armes cotizaciones desde la plataforma (o integraciones que usen el listado de
          conversaciones), podés incluir o excluir los grupos de WhatsApp según cómo trabaje tu equipo.
        </p>
        <form onSubmit={guardarCotizacionPreferencias} className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#C4B5FD]">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-[#7B2FF7]/40"
              checked={cotizacionIncluyeGrupos}
              onChange={(e) => setCotizacionIncluyeGrupos(e.target.checked)}
            />
            <span>Incluir chats de grupo como fuente al armar cotizaciones</span>
          </label>
          <Button type="submit">Guardar preferencia</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">API de stock / ERP (productos y precios)</h2>
        <p className="mb-4 text-sm leading-relaxed text-[#C4B5FD]">
          Tu sistema de gestión debe exponer una URL <strong className="text-white">GET</strong> que
          devuelva <strong className="text-white">JSON</strong> con productos (lista o dentro de{" "}
          <code className="text-[#A855F7]">productos</code>, <code className="text-[#A855F7]">items</code>,{" "}
          <code className="text-[#A855F7]">data</code>, etc.). Cada ítem puede traer campos como{" "}
          <code className="text-[#A855F7]">nombre</code>/<code className="text-[#A855F7]">name</code>,{" "}
          <code className="text-[#A855F7]">precio</code>/<code className="text-[#A855F7]">price</code>,{" "}
          <code className="text-[#A855F7]">stock</code>/<code className="text-[#A855F7]">cantidad</code>,{" "}
          <code className="text-[#A855F7]">codigo</code>/<code className="text-[#A855F7]">sku</code>. Novarix
          consulta esta URL <strong className="text-white">desde el servidor</strong> cada vez que
          responde un mensaje (junto con archivos y texto de conocimiento).
        </p>
        <form onSubmit={guardarStockApi} className="space-y-4">
          <Input
            label="URL del catálogo (GET)"
            value={stockUrl}
            onChange={(e) => setStockUrl(e.target.value)}
            placeholder="https://tu-erp.com/api/novarix/productos"
          />
          <Input
            label="Token / API key (opcional)"
            type="password"
            value={stockToken}
            onChange={(e) => setStockToken(e.target.value)}
            placeholder="Dejá vacío para no cambiar el guardado"
          />
          <Input
            label="Nombre del header del token (opcional)"
            value={stockHeader}
            onChange={(e) => setStockHeader(e.target.value)}
            placeholder="Vacío = Authorization: Bearer … · Ej: X-API-Key"
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Guardar integración</Button>
            <Button type="button" variant="secondary" onClick={() => void probarStockApi()}>
              Probar lectura
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">Cambiar contraseña</h2>
        <form onSubmit={cambiarPassword} className="space-y-4">
          <Input
            label="Contraseña actual"
            type="password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            required
          />
          <Input
            label="Nueva contraseña (mín. 8 caracteres)"
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            required minLength={8}
          />
          <Button type="submit">Actualizar contraseña</Button>
        </form>
      </Card>

      {msg ? <p className="text-sm text-[#A855F7]">{msg}</p> : null}
    </div>
  );
}
