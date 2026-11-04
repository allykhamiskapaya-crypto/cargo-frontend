import { House, LogOut, Package, Plus, Truck } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function MobileBottomNav({ user }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = String(user?.role || "").replace(/^ROLE_/, "");
  const dashboardPath = {
    CUSTOMER: "/dashboard",
    DRIVER: "/driver-dashboard",
    ADMIN: "/admin-dashboard",
  }[role] || "/dashboard";

  const links = [
    { to: dashboardPath, label: t("mobile_home"), icon: House, end: true },
    ...(role === "CUSTOMER"
      ? [
          { to: "/shipments", label: t("mobile_shipments"), icon: Package },
          { to: "/booking", label: t("mobile_book"), icon: Plus },
        ]
      : role === "DRIVER"
        ? [{ to: "/vehicle", label: t("mobile_vehicle"), icon: Truck }]
        : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const itemClass = ({ isActive }) =>
    `flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-300 ${
      isActive ? "font-semibold text-amber-300" : "font-medium text-zinc-400 hover:text-zinc-100"
    }`;

  return (
    <nav
      aria-label={t("mobile_navigation")}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/10 bg-zinc-950/75 pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:hidden"
    >
      <div className="flex min-h-16 items-stretch">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={itemClass}>
            <Icon aria-hidden="true" size={21} className="transition-colors duration-200" />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
        <button type="button" onClick={handleLogout} className={itemClass({ isActive: false })}>
          <LogOut aria-hidden="true" size={21} className="transition-colors duration-200" />
          <span className="max-w-full truncate">{t("logout")}</span>
        </button>
      </div>
    </nav>
  );
}

export default MobileBottomNav;
