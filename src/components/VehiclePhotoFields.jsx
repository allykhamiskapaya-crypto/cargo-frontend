import { useState } from "react";
import { useTranslation } from "react-i18next";

const vehicleAngles = [
  { key: "front", label: "vehicle_photo_front" },
  { key: "rear", label: "vehicle_photo_rear" },
  { key: "right", label: "vehicle_photo_right" },
  { key: "left", label: "vehicle_photo_left" },
];

function VehiclePhotoFields({ photos, onChange, resetKey = 0 }) {
  const { t } = useTranslation();
  const [error, setError] = useState("");

  const handleFileChange = (angle, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1_000_000) {
      setError(t("vehicle_photo_too_large"));
      event.target.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(t("vehicle_photo_invalid"));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange((currentPhotos) => ({
        ...currentPhotos,
        [angle]: { file, preview: String(reader.result) },
      }));
      setError("");
    };
    reader.onerror = () => setError(t("vehicle_photo_invalid"));
    reader.readAsDataURL(file);
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-zinc-300">
        {t("vehicle_photos_required")}
      </legend>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {vehicleAngles.map(({ key, label }) => {
          const photo = photos[key];
          return (
            <label
              key={key}
              className={`group relative flex min-h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border p-2 text-center transition ${
                photo
                  ? "border-amber-400/70 bg-amber-400/10"
                  : "border-dashed border-zinc-700 bg-zinc-900/60 hover:border-amber-500/60"
              }`}
            >
              {photo?.preview ? (
                <img src={photo.preview} alt={t(label)} className="absolute inset-0 h-full w-full object-cover opacity-55" />
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mb-1 h-6 w-6 text-zinc-500 transition group-hover:text-amber-300">
                  <path d="M4 7.5A1.5 1.5 0 015.5 6h2l1.2-1.5h6.6L16.5 6h2A1.5 1.5 0 0120 7.5v10a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5v-10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="12" cy="12.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              )}
              <span className="relative z-10 rounded bg-black/65 px-2 py-1 text-xs font-medium text-white">
                {t(label)}
              </span>
              <span className="relative z-10 mt-1 text-[11px] text-amber-200">
                {photo ? t("vehicle_photo_change") : t("vehicle_photo_add")}
              </span>
              <input
                key={`${resetKey}-${key}-${photo?.file?.name || "empty"}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                required={!photo}
                aria-label={t(label)}
                onChange={(event) => handleFileChange(key, event)}
                className="absolute inset-0 z-20 cursor-pointer opacity-0"
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default VehiclePhotoFields;
