"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Send, X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n-context";

type TemplateComponent = {
  type: string;
  text?: string;
};

type Template = {
  id: string;
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  category: string;
  language: string;
  components?: TemplateComponent[];
};

type MetaTemplatesResponse = {
  data?: Template[];
  error?: string;
};

function StatusBadge({ status, t }: { status: string; t: (k: Parameters<ReturnType<typeof useI18n>["t"]>[0]) => string }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        {t("approved")}
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
        <AlertCircle className="h-3 w-3" />
        {t("rejected")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
      <Clock className="h-3 w-3" />
      {t("pending")}
    </span>
  );
}

function NewTemplateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [language, setLanguage] = useState("es");
  const [bodyText, setBodyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    const r = await fetch("/api/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, language, body_text: bodyText }),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) {
      setErr((j as { error?: string }).error ?? "Error al crear la plantilla.");
      return;
    }
    onCreated();
  }

  const categories = [
    { value: "UTILITY", label: t("utility") },
    { value: "MARKETING", label: t("marketing") },
    { value: "AUTHENTICATION", label: t("authentication") },
  ];

  const languages = [
    { value: "es", label: lang === "en" ? "Spanish (es)" : "Español (es)" },
    { value: "es_AR", label: lang === "en" ? "Spanish Argentina (es_AR)" : "Español Argentina (es_AR)" },
    { value: "en", label: lang === "en" ? "English (en)" : "Inglés (en)" },
    { value: "en_US", label: lang === "en" ? "English US (en_US)" : "Inglés EE.UU. (en_US)" },
    { value: "pt_BR", label: lang === "en" ? "Portuguese Brazil (pt_BR)" : "Portugués Brasil (pt_BR)" },
  ];

  return (
    <div className="rounded-xl border border-[#7B2FF7]/40 bg-[#0A0118]/60 p-5">
      <h3 className="mb-4 text-base font-semibold text-white">{t("newTemplate")}</h3>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Input
          label={t("templateNameLabel")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("templateNamePlaceholder")}
          required
        />
        <div className="w-full space-y-1.5">
          <label className="block text-sm text-[#C4B5FD]">{t("categoryLabel")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white focus:border-[#7B2FF7] focus:outline-none focus:ring-1 focus:ring-[#7B2FF7]/50"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full space-y-1.5">
          <label className="block text-sm text-[#C4B5FD]">{t("languageLabel")}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white focus:border-[#7B2FF7] focus:outline-none focus:ring-1 focus:ring-[#7B2FF7]/50"
          >
            {languages.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full space-y-1.5">
          <label className="block text-sm text-[#C4B5FD]">{t("bodyLabel")}</label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder={t("bodyPlaceholder")}
            rows={4}
            required
            className="w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60 px-3 py-2.5 text-sm text-white placeholder:text-[#7C6FAE] focus:border-[#7B2FF7] focus:outline-none focus:ring-1 focus:ring-[#7B2FF7]/50"
          />
        </div>
        {err ? <p className="text-sm text-red-400">{err}</p> : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                {t("creating")}
              </>
            ) : (
              t("createTemplate")
            )}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SendTemplateDialog({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    const r = await fetch("/api/whatsapp/templates/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateName: template.name,
        languageCode: template.language,
        to,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) {
      setResult({ error: (j as { error?: string }).error ?? "Error al enviar." });
    } else {
      setResult({ ok: true });
    }
  }

  const bodyComponent = template.components?.find((c) => c.type === "BODY");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#7B2FF7]/40 bg-[#0A0118] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{t("sendTemplateTitle")}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9B8FC4] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-[#7B2FF7]/20 bg-[#2D0A5E]/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#7C6FAE]">
            {template.name}
          </p>
          {bodyComponent?.text ? (
            <p className="mt-1 text-sm text-[#C4B5FD]">{bodyComponent.text}</p>
          ) : null}
        </div>

        {result?.ok ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {lang === "en"
              ? "Template sent successfully!"
              : "¡Plantilla enviada con éxito!"}
          </div>
        ) : (
          <form onSubmit={(e) => void handleSend(e)} className="space-y-4">
            <Input
              label={t("destinationLabel")}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={t("destinationPlaceholder")}
              required
            />
            {result?.error ? (
              <p className="text-sm text-red-400">{result.error}</p>
            ) : null}
            <div className="flex gap-3">
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 inline h-4 w-4" />
                    {t("sendBtn")}
                  </>
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function PlantillasWhatsApp() {
  const { t } = useI18n();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<Template | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setApiError("");
    setConfigError(false);
    const r = await fetch("/api/whatsapp/templates");
    const j = (await r.json().catch(() => ({}))) as MetaTemplatesResponse;
    setLoading(false);
    if (!r.ok) {
      if (r.status === 400) setConfigError(true);
      else setApiError(j.error ?? "Error al cargar plantillas.");
      return;
    }
    setTemplates(j.data ?? []);
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{t("messageTemplates")}</h2>
            <p className="mt-1 text-sm text-[#9B8FC4]">
              WhatsApp Business API · Meta Graph API v18.0
            </p>
          </div>
          {!configError && (
            <Button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              {t("newTemplate")}
            </Button>
          )}
        </div>

        {showForm && (
          <div className="mb-6">
            <NewTemplateForm
              onCreated={() => {
                setShowForm(false);
                void fetchTemplates();
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-[#C4B5FD]">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("loadingTemplates")}
          </div>
        ) : configError ? (
          <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <p className="text-sm text-yellow-300">{t("configMissing")}</p>
          </div>
        ) : apiError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{apiError}</p>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-[#9B8FC4]">{t("noTemplates")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#7B2FF7]/20 text-left text-xs font-medium uppercase tracking-wide text-[#7C6FAE]">
                  <th className="pb-3 pr-4">{t("templateNameCol")}</th>
                  <th className="pb-3 pr-4">{t("statusCol")}</th>
                  <th className="pb-3 pr-4">{t("categoryCol")}</th>
                  <th className="pb-3 pr-4">{t("languageCol")}</th>
                  <th className="pb-3">{t("actionsCol")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7B2FF7]/10">
                {templates.map((tpl) => {
                  const body = tpl.components?.find((c) => c.type === "BODY");
                  return (
                    <tr key={tpl.id} className="group">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-white">{tpl.name}</p>
                        {body?.text ? (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-[#9B8FC4]">
                            {body.text}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={tpl.status} t={t} />
                      </td>
                      <td className="py-3 pr-4 text-[#C4B5FD]">{tpl.category}</td>
                      <td className="py-3 pr-4 text-[#C4B5FD]">{tpl.language}</td>
                      <td className="py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={tpl.status !== "APPROVED"}
                          onClick={() => setSendingTemplate(tpl)}
                        >
                          <Send className="mr-1.5 inline h-3.5 w-3.5" />
                          {t("useTemplate")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {sendingTemplate ? (
        <SendTemplateDialog
          template={sendingTemplate}
          onClose={() => setSendingTemplate(null)}
        />
      ) : null}
    </div>
  );
}
