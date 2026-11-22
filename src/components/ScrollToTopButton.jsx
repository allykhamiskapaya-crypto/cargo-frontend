import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";

function ScrollToTopButton({ aboveBottomNav = false, aboveActionBar = false }) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const shouldBeVisible = window.scrollY > 320;
      setIsVisible((visible) => (visible === shouldBeVisible ? visible : shouldBeVisible));
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  };

  const bottomPosition = aboveActionBar
    ? "bottom-[calc(9rem+env(safe-area-inset-bottom))]"
    : aboveBottomNav
      ? "bottom-[calc(5rem+env(safe-area-inset-bottom))]"
      : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]";

  return (
    <button
      type="button"
      aria-label={t("scroll_to_top")}
      title={t("scroll_to_top")}
      aria-hidden={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      onClick={scrollToTop}
      className={`fixed right-4 z-[55] flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/30 bg-zinc-900/90 text-amber-200 shadow-xl shadow-black/30 backdrop-blur-xl transition-all duration-300 hover:border-amber-200/60 hover:bg-amber-300 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 motion-reduce:transition-none md:hidden ${bottomPosition} ${
        isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}

export default ScrollToTopButton;
