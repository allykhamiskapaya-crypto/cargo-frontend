import { useTranslation } from "react-i18next";
import { serviceTypes } from "../constants/serviceTypes";

function ServiceTypeSelector({
  selectedService,
  onChange,
  prices,
  availableVehicleCounts,
  availabilityStatus,
  pendingFareLabel,
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "sw" ? "sw-TZ" : "en-TZ";

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3" role="group" aria-label={t("service_type")}>
      {serviceTypes.map(({ id, label, description, Icon, color, background }) => {
        const selected = selectedService === id;
        const price = prices?.[id];
        const availableCount = availableVehicleCounts?.[id] || 0;

        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={`group relative flex min-h-[12rem] min-w-0 w-full flex-col items-stretch gap-2 overflow-hidden rounded-2xl border p-2.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:min-h-[8rem] sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
              selected
                ? "border-amber-300/50 bg-gradient-to-br from-amber-300/[0.14] to-amber-300/[0.035] text-amber-100 shadow-lg shadow-amber-950/20"
                : "border-white/[0.08] bg-zinc-950/45 text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]"
            } ${id === "SCHEDULE_AHEAD" ? "sm:col-span-2" : ""}`}
          >
            <span className={`flex h-16 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl ${background} ${color} ring-1 ring-white/5 transition group-hover:scale-[1.02] sm:h-[4.5rem] sm:w-[7.5rem]`} style={{ "--service-icon-bg": "rgb(24 24 27)" }}>
              <Icon type={id} size={104} variant="illustration" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words text-xs font-semibold leading-4 sm:text-sm">{t(label)}</span>
              <span className="mt-1 line-clamp-2 block break-words text-[11px] leading-4 text-zinc-500 sm:text-xs sm:leading-5">{t(description)}</span>
              {availabilityStatus && (
                <span className="mt-2 block text-[10px] font-medium leading-4 text-zinc-400 sm:text-xs">
                  {availabilityStatus === "ready"
                    ? t(availableCount > 0
                      ? "booking_vehicle_available_count"
                      : "booking_vehicle_none_available", { count: availableCount })
                    : t(`booking_availability_${availabilityStatus}`)}
                </span>
              )}
              {prices && (
                <span className="mt-2 flex flex-col gap-0.5 border-t border-white/10 pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                    {t("booking_vehicle_estimated_fare")}
                  </span>
                  <span className={`break-words text-sm font-extrabold tabular-nums leading-5 [overflow-wrap:anywhere] sm:text-base ${price == null ? "text-zinc-400" : "text-amber-300"}`}>
                    {price == null
                      ? pendingFareLabel || t("booking_vehicle_fare_pending")
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
