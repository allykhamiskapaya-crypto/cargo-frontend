import { useTranslation } from "react-i18next";
import { serviceTypes } from "../constants/serviceTypes";

function ServiceTypeSelector({ selectedService, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label={t("service_type")}>
      {serviceTypes.map(({ id, label, description, Icon, color, background }) => {
        const selected = selectedService === id;

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
            } ${id === "SCHEDULE_AHEAD" ? "col-span-2" : ""}`}
          >
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${background} ${color} ring-1 ring-white/5 transition group-hover:scale-105`} style={{ "--service-icon-bg": "rgb(24 24 27)" }}>
              <Icon type={id} size={38} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t(label)}</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">{t(description)}</span>
              <span className="mt-2 block text-[11px] font-medium text-amber-200/80">{t("booking_vehicle_fare_hint")}</span>
            </span>
            {selected && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgb(252_211_77/70%)]" />}
          </button>
        );
      })}
    </div>
  );
}

export default ServiceTypeSelector;
