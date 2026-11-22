import { useTranslation } from "react-i18next";

function LanguageSwitcher({ inline }) {
  const { i18n, t } = useTranslation();

  const wrapperClass = inline
    ? "flex gap-1.5 sm:gap-2"
    : "absolute right-4 top-4 flex gap-1.5 sm:gap-2";

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("sw")}
        aria-label={t("language_switch_to_swahili")}
        aria-pressed={i18n.language === "sw"}
        className={`min-h-11 min-w-11 rounded-xl px-2 py-2 text-sm font-medium transition ${
          i18n.language === "sw"
            ? "bg-amber-400 text-zinc-950"
            : "bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
      >
        SW
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("en")}
        aria-label={t("language_switch_to_english")}
        aria-pressed={i18n.language === "en"}
        className={`min-h-11 min-w-11 rounded-xl px-2 py-2 text-sm font-medium transition ${
          i18n.language === "en"
            ? "bg-amber-400 text-zinc-950"
            : "bg-zinc-800 text-zinc-400 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}

export default LanguageSwitcher;