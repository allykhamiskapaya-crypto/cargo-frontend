import { useTranslation } from "react-i18next";

function LanguageSwitcher({ inline }) {
  const { i18n, t } = useTranslation();

  const wrapperClass = inline
    ? "flex gap-2"
    : "absolute top-4 right-4 flex gap-2";

  return (
    <div className={wrapperClass}>
      <button
        type="button"
        onClick={() => i18n.changeLanguage("sw")}
        aria-label={t("language_switch_to_swahili")}
        aria-pressed={i18n.language === "sw"}
        className={`px-3 py-1 rounded-md text-sm font-medium transition ${
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
        className={`px-3 py-1 rounded-md text-sm font-medium transition ${
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