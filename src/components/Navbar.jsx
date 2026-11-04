import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import bebaLogo from "../assets/beba_logo.png";
import api from "../api/axiosClient";

function Navbar({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = String(user?.role || "").replace(/^ROLE_/, "");
  const seenKey = `driver-seen-offers-${user?.id}`;
  const [offers, setOffers] = useState([]);
  const [seenOfferIds, setSeenOfferIds] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(seenKey) || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (role !== "DRIVER" || !user?.id) return undefined;
    let active = true;
    const refreshOffers = async () => {
      try {
        const response = await api.get("/drivers/me/available-jobs");
        if (active) setOffers(Array.isArray(response.data) ? response.data : []);
      } catch {
        if (active) setOffers([]);
      }
    };
    refreshOffers();
    const interval = window.setInterval(refreshOffers, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [role, user?.id]);

  const links = [
    ...(role === "CUSTOMER"
      ? [
          { to: "/dashboard", label: t("dashboard") },
          { to: "/booking", label: t("book_shipment_link") },
          { to: "/shipments", label: t("dashboard_my_shipments") },
          { to: "/tracking", label: t("feature_tracking_title") },
          { to: "/payment", label: t("payment_link") },
        ]
      : []),
    ...(role === "DRIVER"
      ? [
          { to: "/driver-dashboard", label: t("driver_dashboard_link") },
        ]
      : []),
    ...(role === "ADMIN"
      ? [{ to: "/admin-dashboard", label: t("admin_dashboard_link") }]
      : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `block min-h-11 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-amber-400/10 text-amber-300"
        : "text-zinc-300 hover:bg-white/5 hover:text-white"
    }`;

  const renderLinks = () =>
    links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.to === "/dashboard"}
        className={linkClass}
        onClick={() => setMenuOpen(false)}
      >
        {link.label}
      </NavLink>
    ));

  const unreadOfferCount = offers.filter((offer) => !seenOfferIds.includes(offer.id)).length;
  const driverNotificationsButton = role === "DRIVER" && (
    <button
      type="button"
      aria-label={t("driver_notifications_button", { count: unreadOfferCount })}
      title={t("driver_notifications_button", { count: unreadOfferCount })}
      onClick={() => {
        setSeenOfferIds((current) => {
          const next = [...new Set([...current, ...offers.map((offer) => offer.id)])];
          localStorage.setItem(seenKey, JSON.stringify(next));
          return next;
        });
        setMenuOpen(false);
        navigate("/driver-dashboard");
      }}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-200 transition hover:border-amber-300/40 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
    >
      <Bell size={18} aria-hidden="true" />
      {unreadOfferCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-zinc-950 bg-amber-300 px-1 text-[10px] font-bold text-zinc-950">{unreadOfferCount > 9 ? "9+" : unreadOfferCount}</span>}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-zinc-950/75 text-white shadow-lg shadow-black/10 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/dashboard"
          className="flex min-w-0 items-center gap-3"
          aria-label={t("dashboard_brand_aria")}
          onClick={() => setMenuOpen(false)}
        >
          <img
            src={bebaLogo}
            alt={t("brand_logo_alt")}
            className="h-11 w-11 shrink-0 rounded-xl bg-white p-0.5 object-contain shadow-lg shadow-black/20"
          />
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight text-amber-300">
              BEBA
            </span>
            <span className="hidden max-w-48 text-xs leading-tight text-zinc-400 sm:block">
              {t("brand_tagline")}
            </span>
          </span>
        </Link>

        <nav aria-label={t("primary_navigation")} className="hidden items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-1 md:flex">
          {renderLinks()}
          {driverNotificationsButton}
          <LanguageSwitcher inline />
          <button
            type="button"
            onClick={handleLogout}
            className="ml-1 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-amber-300/40 hover:bg-amber-300/[0.06] hover:text-amber-200"
          >
            {t("logout")}
          </button>
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <LanguageSwitcher inline />
          {driverNotificationsButton}
          <button
            type="button"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-white transition hover:border-amber-300/60"
            aria-label={menuOpen ? t("close_menu") : t("open_menu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span
              className={`h-0.5 w-5 bg-current transition-transform duration-200 ${
                menuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-5 bg-current transition-opacity duration-200 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-5 bg-current transition-transform duration-200 ${
                menuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden ${
          menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <nav aria-label={t("mobile_navigation")} className="space-y-1 border-t border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-2xl">
            {renderLinks()}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-zinc-300 transition hover:bg-white/5 hover:text-amber-200"
            >
              {t("logout")}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
