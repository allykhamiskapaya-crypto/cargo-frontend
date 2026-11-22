import { useTranslation } from "react-i18next";
import { serviceTypes } from "../constants/serviceTypes";

function ServiceTypeSelector({ selectedService, onChange, prices }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "sw" ? "sw-TZ" : "en-TZ";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label={t("service_type")}>
      {serviceTypes.map(({ id, label, description, Icon, color, background }) => {
        const selected = selectedService === id;
        const price = prices?.[id];

        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={`group relative flex min-h-[7.5rem] w-full items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
              selected
                ? "border-amber-300/50 bg-gradient-to-br from-amber-300/[0.14] to-amber-300/[0.035] text-amber-100 shadow-lg shadow-amber-950/20"
                : "border-white/[0.08] bg-zinc-950/45 text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
            } ${id === "SCHEDULE_AHEAD" ? "sm:col-span-2" : ""}`}
          >
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${background} ${color} ring-1 ring-white/5 transition group-hover:scale-105`} style={{ "--service-icon-bg": "rgb(24 24 27)" }}>
              <Icon type={id} size={38} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t(label)}</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">{t(description)}</span>
              {prices && (
                <span className="mt-3 flex flex-col gap-0.5 border-t border-white/10 pt-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                    {t("booking_vehicle_estimated_fare")}
                  </span>
                  <span className={`text-base font-extrabold tabular-nums leading-6 ${price == null ? "text-zinc-400" : "text-amber-300"}`}>
                    {price == null
                      ? t("booking_vehicle_fare_pending")
                      : `TZS ${Number(price).toLocaleString(locale)}`}
                  </span>
                </span>
              )}
            </span>
            {selected && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgb(252_211_77/70%)]" />}
          </button>
        );
      })}
    </div>
  );
}

export default ServiceTypeSelector;
