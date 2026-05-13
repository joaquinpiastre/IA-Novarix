"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Lang = "es" | "en";

const translations = {
  es: {
    // Sidebar
    templates: "Plantillas",
    // Templates page
    messageTemplates: "Plantillas de WhatsApp",
    newTemplate: "Nueva plantilla",
    templateNameCol: "Nombre",
    statusCol: "Estado",
    categoryCol: "Categoría",
    languageCol: "Idioma",
    actionsCol: "Acciones",
    useTemplate: "Usar plantilla",
    noTemplates: "No hay plantillas. Creá una nueva.",
    loadingTemplates: "Cargando plantillas…",
    configMissing: "Configurá el WABA ID y el Access Token de WhatsApp en Configuración para ver las plantillas.",
    // New template form
    templateNameLabel: "Nombre de la plantilla",
    templateNamePlaceholder: "ej: bienvenida_cliente",
    categoryLabel: "Categoría",
    languageLabel: "Idioma",
    bodyLabel: "Contenido del mensaje",
    bodyPlaceholder: "Escribí el texto de la plantilla aquí…",
    creating: "Creando…",
    createTemplate: "Crear plantilla",
    cancel: "Cancelar",
    // Send dialog
    sendTemplateTitle: "Enviar plantilla",
    destinationLabel: "Número de destino (con código de país)",
    destinationPlaceholder: "5491123456789",
    sending: "Enviando…",
    sendBtn: "Enviar",
    // Categories
    utility: "Utilidad",
    marketing: "Marketing",
    authentication: "Autenticación",
    // Status
    approved: "Aprobada",
    pending: "Pendiente",
    rejected: "Rechazada",
    // WhatsApp Business Card
    whatsappBusiness: "WhatsApp Business",
    wabaConnected: "Cuenta conectada",
    wabaNotConnected: "Sin cuenta configurada",
    phoneNumberId: "Phone Number ID",
    wabaId: "WABA ID",
    verificationStatus: "Estado de verificación",
    reconnect: "Reconfigurar",
    goToConfig: "Ir a Configuración",
    // OAuth card for WA
    connectWhatsAppBusiness: "Conectar WhatsApp Business",
    connectWhatsAppDesc:
      "Autorizá los permisos whatsapp_business_messaging y whatsapp_business_management para gestionar tu cuenta de WhatsApp Business desde Novarix.",
    permissionsRequested: "Permisos solicitados",
    // Lang toggle
    switchLang: "English",
  },
  en: {
    // Sidebar
    templates: "Templates",
    // Templates page
    messageTemplates: "WhatsApp Message Templates",
    newTemplate: "New Template",
    templateNameCol: "Name",
    statusCol: "Status",
    categoryCol: "Category",
    languageCol: "Language",
    actionsCol: "Actions",
    useTemplate: "Use Template",
    noTemplates: "No templates found. Create a new one.",
    loadingTemplates: "Loading templates…",
    configMissing:
      "Set the WABA ID and WhatsApp Access Token in Settings to view templates.",
    // New template form
    templateNameLabel: "Template name",
    templateNamePlaceholder: "e.g. welcome_customer",
    categoryLabel: "Category",
    languageLabel: "Language",
    bodyLabel: "Message body",
    bodyPlaceholder: "Write the template text here…",
    creating: "Creating…",
    createTemplate: "Create Template",
    cancel: "Cancel",
    // Send dialog
    sendTemplateTitle: "Send Template",
    destinationLabel: "Destination number (with country code)",
    destinationPlaceholder: "5491123456789",
    sending: "Sending…",
    sendBtn: "Send",
    // Categories
    utility: "Utility",
    marketing: "Marketing",
    authentication: "Authentication",
    // Status
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
    // WhatsApp Business Card
    whatsappBusiness: "WhatsApp Business",
    wabaConnected: "Account connected",
    wabaNotConnected: "No account configured",
    phoneNumberId: "Phone Number ID",
    wabaId: "WABA ID",
    verificationStatus: "Verification status",
    reconnect: "Reconfigure",
    goToConfig: "Go to Settings",
    // OAuth card for WA
    connectWhatsAppBusiness: "Connect WhatsApp Business",
    connectWhatsAppDesc:
      "Authorize whatsapp_business_messaging and whatsapp_business_management permissions to manage your WhatsApp Business account from Novarix.",
    permissionsRequested: "Permissions requested",
    // Lang toggle
    switchLang: "Español",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["es"];

type I18nContextValue = {
  lang: Lang;
  toggle: () => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue>({
  lang: "es",
  toggle: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const saved = localStorage.getItem("novarix_lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === "es" ? "en" : "es";
      localStorage.setItem("novarix_lang", next);
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key] as string,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, toggle, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
