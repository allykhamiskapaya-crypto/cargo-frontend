import { useTranslation } from "react-i18next";
import { serviceTypes } from "../constants/serviceTypes";

function VehicleTypeSelector({ value, onChange }) {
  const { t } = useTranslation();

  const handleKeyDown = (event, currentIndex) => {
    const nextIndex = {
      ArrowRight: (currentIndex + 1) % serviceTypes.length,
      ArrowDown: (currentIndex + 1) % serviceTypes.length,
      ArrowLeft: (currentIndex + serviceTypes.length - 1) % serviceTypes.length,
      ArrowUp: (currentIndex + serviceTypes.length - 1) % serviceTypes.length,
      Home: 0,
      End: serviceTypes.length - 1,
    }[event.key];
    if (nextIndex === undefined) return;

    event.preventDefault();
    onChange(serviceTypes[nextIndex].id);
    const radioButtons = event.currentTarget.parentElement.querySelectorAll('[role="radio"]');
    radioButtons[nextIndex]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("vehicle_type")}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      {serviceTypes.map(({ id, label, description, Icon, color, background }, index) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!value && index === 0) ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`flex min-h-24 items-center gap-3 rounded-lg border px-3 py-3 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              selected
                ? "border-amber-400 bg-amber-400/15 text-amber-200 shadow-[inset_0_0_0_1px_rgb(251_191_36_/_0.35)]"
                : "border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-amber-500/50 hover:text-zinc-200"
            }`}
          >
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${background} ${color}`}>
              <Icon type={id} size={36} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t(label)}</span>
              <span className="mt-1 block text-xs leading-4 text-zinc-500">{t(description)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default VehicleTypeSelector;
