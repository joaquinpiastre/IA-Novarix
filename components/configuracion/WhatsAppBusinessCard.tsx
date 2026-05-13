"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Smartphone, Building2, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n-context";

type EmpresaWA = {
  whatsappPhoneId?: string | null;
  whatsappWabaId?: string | null;
  whatsappNumero?: string | null;
};

type WABAInfo = {
  name?: string;
  currency?: string;
  message_template_namespace?: string;
  on_behalf_of_business_info?: { name?: string };
};

export function WhatsAppBusinessCard() {
  const { t, lang } = useI18n();
  const [empresa, setEmpresa] = useState<EmpresaWA | null>(null);
  const [wabaInfo, setWabaInfo] = useState<WABAInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/empresa");
      if (r.ok) setEmpresa((await r.json()) as EmpresaWA);
    })();
  }, []);

  useEffect(() => {
    if (!empresa?.whatsappWabaId) return;
    setLoadingInfo(true);
    void (async () => {
      const r = await fetch("/api/whatsapp/account-info");
      if (r.ok) setWabaInfo((await r.json()) as WABAInfo);
      setLoadingInfo(false);
    })();
  }, [empresa?.whatsappWabaId]);

  const isConfigured = !!(empresa?.whatsappPhoneId && empresa.whatsappWabaId);

  const label = (es: string, en: string) => (lang === "en" ? en : es);

  return (
    <Card>
      <div className="mb-5 flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${
            isConfigured
              ? "bg-gradient-to-br from-emerald-500/30 to-emerald-600/20"
              : "bg-gradient-to-br from-[#25D366]/20 to-[#128C7E]/20"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-[#25D366]">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">{t("whatsappBusiness")}</h2>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[#7C6FAE]">
            {isConfigured ? t("wabaConnected") : t("wabaNotConnected")}
          </p>
        </div>
        {isConfigured && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
        )}
      </div>

      {isConfigured ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              icon={<Smartphone className="h-4 w-4 text-[#25D366]" />}
              label={t("phoneNumberId")}
              value={empresa?.whatsappPhoneId ?? "—"}
            />
            <InfoRow
              icon={<Building2 className="h-4 w-4 text-[#7B2FF7]" />}
              label={t("wabaId")}
              value={empresa?.whatsappWabaId ?? "—"}
            />
          </div>

          {loadingInfo ? (
            <div className="flex items-center gap-2 text-xs text-[#9B8FC4]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {label("Cargando datos de WABA…", "Loading WABA data…")}
            </div>
          ) : wabaInfo?.name ? (
            <div className="rounded-lg border border-[#7B2FF7]/20 bg-[#0A0118]/40 p-3">
              <p className="text-xs text-[#7C6FAE]">
                {label("Nombre de la cuenta", "Account name")}
              </p>
              <p className="text-sm font-medium text-white">{wabaInfo.name}</p>
              {wabaInfo.on_behalf_of_business_info?.name ? (
                <p className="mt-1 text-xs text-[#9B8FC4]">
                  {label("Negocio:", "Business:")} {wabaInfo.on_behalf_of_business_info.name}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("verificationStatus")}: {label("Activo", "Active")}
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2FF7]/30 bg-[#7B2FF7]/10 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
              whatsapp_business_messaging
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2FF7]/30 bg-[#7B2FF7]/10 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
              whatsapp_business_management
            </div>
          </div>

          <p className="mt-1 text-xs text-[#7C6FAE]">
            {label(
              "Podés actualizar el Phone Number ID y el WABA ID en la sección «WhatsApp Business (Meta)» más abajo.",
              "You can update the Phone Number ID and WABA ID in the «WhatsApp Business (Meta)» section below."
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[#C4B5FD]">
            {t("connectWhatsAppDesc")}
          </p>

          <div className="rounded-lg border border-[#7B2FF7]/20 bg-[#0A0118]/40 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#7C6FAE]">
              {t("permissionsRequested")}
            </p>
            <ul className="space-y-1.5">
              {[
                "whatsapp_business_messaging",
                "whatsapp_business_management",
              ].map((perm) => (
                <li key={perm} className="flex items-center gap-2 text-sm text-[#C4B5FD]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7B2FF7]" />
                  <code className="text-xs text-[#A855F7]">{perm}</code>
                </li>
              ))}
            </ul>
          </div>

          <a href="/api/meta/oauth/whatsapp" className="inline-block w-full sm:w-auto">
            <Button type="button" className="w-full sm:w-auto">
              <ExternalLink className="mr-2 inline h-4 w-4" />
              {t("connectWhatsAppBusiness")}
            </Button>
          </a>

          <p className="text-xs text-[#7C6FAE]">
            {label(
              "También podés configurar manualmente el Phone Number ID y el Access Token en la sección «WhatsApp Business (Meta)» más abajo.",
              "You can also manually configure the Phone Number ID and Access Token in the «WhatsApp Business (Meta)» section below."
            )}
          </p>
        </div>
      )}
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#7B2FF7]/20 bg-[#0A0118]/40 p-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-[#7C6FAE]">{label}</p>
        <p className="truncate text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
