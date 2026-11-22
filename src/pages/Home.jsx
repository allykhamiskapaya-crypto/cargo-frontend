import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Home as HomeIcon, Info, LogIn, Mail, Menu, Truck, UserPlus, X } from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import MobileNavigationDrawer from "../components/MobileNavigationDrawer";
import ScrollToTopButton from "../components/ScrollToTopButton";
import bebaLogo from "../assets/beba_logo.jpeg";
import optimizedCargoTruck from "../assets/cargo-truck-highway-optimized.jpg";
import { startVisibleInterval } from "../utils/startVisibleInterval";

const heroImages = [
  optimizedCargoTruck,
  "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1400&q=75",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=75",
];

function Home() {
  const { t } = useTranslation();
  const [activeImage, setActiveImage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const stopCarousel = startVisibleInterval(() => {
      setActiveImage((currentImage) => (currentImage + 1) % heroImages.length);
    }, 6500, false);

    return stopCarousel;
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-zinc-950 to-zinc-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-zinc-950/70 text-white shadow-lg shadow-black/10 backdrop-blur-2xl">
        <nav aria-label={t("primary_navigation")} className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-3 min-[400px]:px-4 sm:gap-4 sm:px-8">
          <Link to="/" onClick={closeMenu} className="flex min-w-0 items-center gap-3" aria-label={t("home_brand_aria")}>
          <img
            src={bebaLogo}
            alt={t("brand_logo_alt")}
            className="h-11 w-11 shrink-0 rounded-xl bg-white p-0.5 object-contain shadow-lg shadow-black/20"
          />
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight text-amber-300">BEBA</span>
            <span className="hidden text-xs text-zinc-400 sm:block">{t("brand_tagline")}</span>
          </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
            <a href="#features" className="transition hover:text-amber-200">{t("nav_features")}</a>
            <a href="#how" className="transition hover:text-amber-200">{t("nav_how")}</a>
            <a href="#contact" className="transition hover:text-amber-200">{t("nav_contact")}</a>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher inline />
            <div className="hidden items-center gap-3 md:flex">
              <Link to="/login" className="px-2 py-2 text-sm font-medium text-zinc-300 transition hover:text-white">
                {t("login_button")}
              </Link>
              <Link to="/register" className="rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-4 py-2.5 text-sm font-bold text-neutral-950 shadow-lg shadow-amber-400/10 transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-300">
                {t("get_started")}
              </Link>
            </div>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-white transition hover:border-amber-300/70 hover:text-amber-200 md:hidden"
              aria-label={menuOpen ? t("close_menu") : t("open_menu")}
              aria-expanded={menuOpen}
              aria-controls="home-mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X aria-hidden="true" size={21} /> : <Menu aria-hidden="true" size={21} />}
            </button>
          </div>
        </nav>

        <MobileNavigationDrawer
          id="home-mobile-navigation"
          open={menuOpen}
          onClose={closeMenu}
          brandTo="/"
          brandLogo={bebaLogo}
          logoAlt={t("brand_logo_alt")}
          tagline={t("brand_tagline")}
          closeLabel={t("close_menu")}
          navigationLabel={t("mobile_navigation")}
          headerActions={(
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={closeMenu}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-center text-sm font-medium text-zinc-200 transition hover:border-amber-300/50 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <LogIn size={16} aria-hidden="true" />
                {t("login_button")}
              </Link>
              <Link
                to="/register"
                onClick={closeMenu}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-3 py-2 text-center text-sm font-bold text-zinc-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <UserPlus size={16} aria-hidden="true" />
                {t("register_button")}
              </Link>
              <Link
                to="/register?role=DRIVER"
                onClick={closeMenu}
                className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-3 py-2 text-center text-sm font-semibold text-amber-100 transition hover:border-amber-300/40 hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <Truck size={16} aria-hidden="true" />
                {t("nav_join_driver")}
              </Link>
            </div>
          )}
        >
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/"
              onClick={closeMenu}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-amber-300/30 hover:bg-amber-300/[0.06] hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <HomeIcon size={17} className="shrink-0 text-amber-200" aria-hidden="true" />
              <span className="truncate">{t("nav_home")}</span>
            </Link>
            <a
              href="#features"
              onClick={closeMenu}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-amber-300/30 hover:bg-amber-300/[0.06] hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <Info size={17} className="shrink-0 text-amber-200" aria-hidden="true" />
              <span className="truncate">{t("nav_features")}</span>
            </a>
            <a
              href="#how"
              onClick={closeMenu}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-amber-300/30 hover:bg-amber-300/[0.06] hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <BookOpen size={17} className="shrink-0 text-amber-200" aria-hidden="true" />
              <span className="truncate">{t("nav_how")}</span>
            </a>
            <a
              href="#contact"
              onClick={closeMenu}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-amber-300/30 hover:bg-amber-300/[0.06] hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <Mail size={17} className="shrink-0 text-amber-200" aria-hidden="true" />
              <span className="truncate">{t("nav_contact")}</span>
            </a>
          </div>
        </MobileNavigationDrawer>
      </header>

      <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-neutral-950 px-4 py-12 sm:px-8 sm:py-24 lg:px-12">
        <div className="absolute inset-0 -z-20">
          <img
            key={activeImage}
            src={heroImages[activeImage]}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="hero-image absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-neutral-950/45" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_40%,_transparent_0%,_rgba(8,9,10,0.18)_55%,_rgba(8,9,10,0.75)_100%)]" />
        <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-3xl rounded-3xl border border-white/[0.08] bg-zinc-950/25 p-4 shadow-2xl shadow-black/20 backdrop-blur-[2px] sm:p-8">
        <span className="mb-5 inline-block max-w-full break-words rounded-full border border-amber-300/30 bg-amber-300/[0.08] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-amber-100 sm:mb-6">
          {t("hero_badge")}
        </span>
        <h1 className="mb-5 break-words text-3xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere] min-[400px]:text-4xl sm:mb-6 sm:text-5xl md:text-7xl">
          {t("hero_title_1")} <span className="text-amber-300">{t("hero_title_highlight")}</span> {t("hero_title_2")}
        </h1>
        <p className="mb-8 max-w-2xl break-words text-base leading-7 text-zinc-200 sm:mb-10 sm:text-xl">
          {t("hero_subtitle")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/register" className="flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-6 py-3.5 text-center font-bold text-neutral-950 shadow-lg shadow-amber-400/10 transition duration-200 hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-300">
            {t("hero_cta_primary")}
          </Link>
          <a href="#how" className="flex min-h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.04] px-6 py-3.5 text-center font-medium text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/50 hover:bg-white/[0.08] hover:text-amber-100">
            {t("hero_cta_secondary")}
          </a>
        </div>
        </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl border-t border-white/[0.08] px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <h2 className="mb-3 text-center text-2xl font-bold tracking-tight sm:text-3xl">{t("features_title")}</h2>
        <div className="mx-auto mb-10 h-1 w-14 rounded-full bg-gradient-to-r from-amber-300 to-orange-400" />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: "📦", key: "booking" },
            { icon: "📍", key: "tracking" },
            { icon: "💳", key: "payment" },
          ].map((f) => (
            <div key={f.key} className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:border-amber-300/25 hover:bg-white/[0.055] sm:p-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/[0.08] text-3xl transition group-hover:bg-amber-300/[0.13]">{f.icon}</div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight">{t(`feature_${f.key}_title`)}</h3>
              <p className="text-sm leading-6 text-zinc-400">{t(`feature_${f.key}_desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl border-t border-white/[0.08] px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <h2 className="mb-3 text-center text-2xl font-bold tracking-tight sm:text-3xl">{t("how_title")}</h2>
        <div className="mx-auto mb-10 h-1 w-14 rounded-full bg-gradient-to-r from-amber-300 to-orange-400" />
        <div className="grid gap-4 md:grid-cols-3">
          {["1", "2", "3"].map((step) => (
            <div key={step} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-center transition hover:border-white/15 hover:bg-white/[0.04] sm:p-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300 to-orange-400 font-bold text-neutral-950 shadow-lg shadow-amber-400/10">
                {step}
              </div>
              <h3 className="mb-2 font-semibold">{t(`how_step${step}_title`)}</h3>
              <p className="text-sm leading-6 text-zinc-400">{t(`how_step${step}_desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl border-t border-white/[0.08] px-4 py-14 text-center sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.07] via-white/[0.025] to-transparent px-4 py-8 shadow-2xl shadow-black/15 backdrop-blur-xl sm:px-10 sm:py-12">
        <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">{t("cta_title")}</h2>
        <p className="mb-8 text-sm leading-6 text-zinc-400 sm:text-base">{t("cta_subtitle")}</p>
        <Link to="/register" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-8 py-3.5 font-bold text-neutral-950 shadow-lg shadow-amber-400/10 transition duration-200 hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-300">
          {t("hero_cta_primary")}
        </Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] bg-zinc-950/70 px-4 py-8 text-center text-sm text-zinc-500 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="font-semibold tracking-wide text-amber-200/80">BEBA</span>
          <span>© {new Date().getFullYear()} {t("footer_brand_word")}. {t("footer_rights")}</span>
        </div>
      </footer>
      <ScrollToTopButton />
    </div>
  );
}

export default Home;