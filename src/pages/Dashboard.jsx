import { useEffect, useState } from "react";
import { ArrowRight, Bell, CircleHelp, ClipboardList, CreditCard, LoaderCircle, MapPin, MapPinned, Navigation, PackagePlus, RefreshCw, Truck } from "lucide-react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import ServiceTypeSelector from "../components/ServiceTypeSelector";
import CustomerLiveMap from "../components/CustomerLiveMap";

const notificationReadKey = (userId) => `beba.customer.shipment-updates-read.${userId}`;

function getInitialReadAt(userId) {
  const key = notificationReadKey(userId);
  try {
    const storedValue = Number(localStorage.getItem(key));
    if (storedValue > 0) return storedValue;
    const initialReadAt = Date.now();
    localStorage.setItem(key, String(initialReadAt));
    return initialReadAt;
  } catch {
    return Date.now();
  }
}

const shipmentStatusStyles = {
  PENDING: "border-yellow-400/25 bg-yellow-400/10 text-yellow-200",
  ASSIGNED: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  PICKED_UP: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  IN_TRANSIT: "border-amber-300/40 bg-amber-300/15 text-amber-100",
  DELIVERED: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  CANCELLED: "border-red-400/25 bg-red-400/10 text-red-200",
};

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = String(user?.role || "").replace(/^ROLE_/, "");
  const [shipments, setShipments] = useState([]);
  const [shipmentState, setShipmentState] = useState("loading");
  const [retryCount, setRetryCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastReadAt, setLastReadAt] = useState(() => getInitialReadAt(user?.id));
  const [destination, setDestination] = useState("");
  const [selectedService, setSelectedService] = useState("");

  useEffect(() => {
    if (role !== "CUSTOMER" || !user?.id) return undefined;

    let isActive = true;
    const loadShipments = async () => {
      try {
        const response = await api.get(`/shipments/customer/${user.id}`);
        if (isActive) {
          setShipments(Array.isArray(response.data) ? response.data : []);
          setShipmentState("success");
        }
      } catch {
        if (isActive) setShipmentState("error");
      }
    };

    loadShipments();
    const refreshInterval = window.setInterval(loadShipments, 5000);
    return () => {
      isActive = false;
      window.clearInterval(refreshInterval);
    };
  }, [retryCount, user?.id, role]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === "CUSTOMER") {
    const continueToBooking = () => {
      const params = new URLSearchParams({
        destination: destination.trim(),
        service: selectedService,
      });
      navigate(`/booking?${params.toString()}`);
    };

    const recentShipments = [...shipments].sort((first, second) =>
      new Date(second.updatedAt || second.createdAt || 0) - new Date(first.updatedAt || first.createdAt || 0),
    );
    const unreadCount = recentShipments.filter((shipment) =>
      new Date(shipment.updatedAt || shipment.createdAt || 0).getTime() > lastReadAt,
    ).length;
    const formatShipmentDate = (value) => {
      if (!value) return t("dashboard_date_unavailable");
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? t("dashboard_date_unavailable")
        : date.toLocaleDateString();
    };

    const toggleNotifications = () => {
      const opening = !notificationsOpen;
      setNotificationsOpen(opening);
      if (opening) {
        const readAt = Date.now();
        localStorage.setItem(notificationReadKey(user.id), String(readAt));
        setLastReadAt(readAt);
      }
    };

    return (
      <main className="min-h-[calc(100vh-4rem)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">
                {t("welcome")}, {user.fullName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
                <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-200">
                  {t("customer")}
                </span>
                <span className="break-all">{user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="relative">
                <button
                  type="button"
                  onClick={toggleNotifications}
                  aria-label={t("dashboard_notifications_button", { count: unreadCount })}
                  aria-expanded={notificationsOpen}
                  aria-controls="customer-notifications"
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80 text-zinc-200 transition hover:border-amber-300/50 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  <Bell aria-hidden="true" size={19} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-neutral-950 bg-amber-400 px-1 text-[10px] font-bold text-neutral-950">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <section
                    id="customer-notifications"
                    aria-label={t("dashboard_notifications_title")}
                    className="absolute right-0 z-40 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-xl shadow-black/40 backdrop-blur-xl"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-white">{t("dashboard_notifications_title")}</h2>
                      <span className="text-xs text-zinc-500">{t("dashboard_recent_updates")}</span>
                    </div>
                    {recentShipments.length === 0 ? (
                      <p className="py-3 text-sm text-zinc-400">{t("dashboard_no_notifications")}</p>
                    ) : (
                      <ul className="space-y-3 p-4 sm:p-5">
                        {recentShipments.slice(0, 5).map((shipment) => (
                          <li key={shipment.id} className="py-3 first:pt-1 last:pb-1">
                            <p className="text-sm font-medium text-zinc-100">
                              {t("dashboard_shipment_number", { id: shipment.id })}
                              <span className="mx-1.5 text-zinc-600">·</span>
                              <span className="text-amber-200">{shipment.status}</span>
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {shipment.origin} <span className="px-1 text-zinc-700">→</span> {shipment.destination}
                            </p>
                            <p className="mt-1 text-xs text-zinc-600">
                              {formatShipmentDate(shipment.updatedAt || shipment.createdAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>
              <Link
                to="/#contact"
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-zinc-400 transition hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <CircleHelp aria-hidden="true" size={17} />
                <span>{t("dashboard_help_support")}</span>
              </Link>
            </div>
          </header>

          <section className="mb-7 grid overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/65 shadow-2xl shadow-black/20 backdrop-blur-xl lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
            <div className="relative min-h-[400px] lg:min-h-[500px]">
              <CustomerLiveMap />
            </div>

            <div className="bg-gradient-to-br from-white/[0.025] to-transparent p-5 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">{t("dashboard_primary_action_eyebrow")}</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{t("dashboard_map_title")}</h2>
              <p className="mt-1 text-sm text-zinc-400">{t("dashboard_map_subtitle")}</p>

              <label htmlFor="dashboard-destination" className="sr-only">{t("dashboard_destination_prompt")}</label>
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 focus-within:border-amber-300/60 focus-within:ring-2 focus-within:ring-amber-300/30">
                <MapPin aria-hidden="true" className="shrink-0 text-amber-300" size={19} />
                <input
                  id="dashboard-destination"
                  type="text"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && destination.trim() && selectedService) {
                      event.preventDefault();
                      continueToBooking();
                    }
                  }}
                  placeholder={t("dashboard_destination_prompt")}
                  className="min-h-14 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                />
              </div>

              <div className="mt-5">
                <h3 className="mb-3 text-sm font-semibold text-zinc-200">{t("service_type")}</h3>
                <ServiceTypeSelector selectedService={selectedService} onChange={setSelectedService} />
              </div>

              <button
                type="button"
                onClick={continueToBooking}
                disabled={!destination.trim() || !selectedService}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("dashboard_continue_booking")}
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          </section>

          <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                to="/tracking"
                className="group flex min-h-24 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-white/[0.055] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">
                  <MapPinned aria-hidden="true" size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-100">{t("feature_tracking_title")}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{t("dashboard_tracking_hint")}</span>
                </span>
              </Link>
              <Link
                to="/payment"
                className="group flex min-h-24 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-white/[0.055] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">
                  <CreditCard aria-hidden="true" size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-100">{t("payment_link")}</span>
                  <span className="mt-1 block text-xs text-zinc-500">{t("dashboard_payment_hint")}</span>
                </span>
              </Link>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/65 shadow-xl shadow-black/10 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-white">{t("dashboard_my_shipments")}</h2>
                {shipmentState === "success" && shipments.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {t("dashboard_recent_shipments_count", { count: Math.min(shipments.length, 4), total: shipments.length })}
                  </p>
                )}
              </div>
              {shipments.length > 0 && (
                <Link to="/shipments" className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 text-sm font-medium text-amber-200 transition hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
                  {t("dashboard_view_all")}
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>

            {shipmentState === "loading" ? (
              <div role="status" className="flex items-center gap-3 px-5 py-10 text-sm text-zinc-400 sm:px-6">
                <LoaderCircle aria-hidden="true" className="animate-spin text-amber-300" size={18} />
                {t("dashboard_shipments_loading")}
              </div>
            ) : shipmentState === "error" ? (
              <div className="flex flex-col items-start gap-3 px-5 py-8 sm:px-6">
                <p role="alert" className="text-sm text-red-300">{t("backend_error")}</p>
                <button
                  type="button"
                  onClick={() => { setShipmentState("loading"); setRetryCount((count) => count + 1); }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-300/25 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  <RefreshCw aria-hidden="true" size={15} />
                  {t("dashboard_try_again")}
                </button>
              </div>
            ) : shipments.length === 0 ? (
              <div className="px-5 py-9 text-center sm:px-6">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-amber-300/10 text-amber-200">
                  <PackagePlus aria-hidden="true" size={20} />
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{t("dashboard_empty_title")}</h3>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-400">{t("dashboard_empty_message")}</p>
                <Link to="/booking" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-amber-400 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
                  <PackagePlus aria-hidden="true" size={17} />
                  {t("book_shipment_link")}
                </Link>
              </div>
            ) : (
              <>
                <p role="status" className="sr-only">{t("dashboard_shipments_loaded", { count: shipments.length })}</p>
                <ul className="divide-y divide-white/10">
                  {recentShipments.slice(0, 4).map((shipment) => (
                    <li key={shipment.id}>
                      <Link
                        to={`/tracking?id=${shipment.id}`}
                        className="group flex min-h-24 flex-col justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/20 hover:bg-white/[0.045] focus-visible:outline-2 focus-visible:outline-amber-300 sm:flex-row sm:items-center sm:p-5"
                      >
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("dashboard_shipment_number", { id: shipment.id })}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${shipmentStatusStyles[shipment.status] || "border-white/10 bg-white/5 text-zinc-300"}`}>
                              {shipment.status}
                            </span>
                          </div>
                          <div className="grid max-w-xl gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                            <span className="break-words text-sm font-medium text-zinc-100">{shipment.origin}</span>
                            <ArrowRight size={15} className="hidden text-zinc-600 sm:block" aria-hidden="true" />
                            <span className="break-words text-sm font-medium text-zinc-100">{shipment.destination}</span>
                          </div>
                          <span className="mt-2 block text-xs text-zinc-500">{formatShipmentDate(shipment.updatedAt || shipment.createdAt)}</span>
                        </div>
                        <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-300 px-3.5 py-2 text-xs font-bold text-zinc-950 transition group-hover:bg-sky-200">
                          <Navigation size={14} aria-hidden="true" />
                          {t("tracking_track_live")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="relative min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/65 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-9">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {t("welcome")}, {user.fullName} 👋
          </h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
              {user.role}
            </span>
            <span className="text-zinc-500">{user.email}</span>
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            {role !== "DRIVER" && (
              <Link
                to="/tracking"
                className="group inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-zinc-100 transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/35 hover:bg-amber-300/[0.06] hover:text-amber-100"
              >
                <MapPinned size={17} className="text-amber-200" aria-hidden="true" />
                {t("feature_tracking_title")}
                <ArrowRight size={15} className="opacity-60 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )}

            {role === "CUSTOMER" && (
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-4 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/10 transition duration-200 hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-300"
              >
                <ClipboardList size={17} aria-hidden="true" />
                {t("book_shipment_link")}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}

            {role === "CUSTOMER" && (
              <Link
                to="/payment"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-white/[0.06]"
              >
                {t("payment_link")}
              </Link>
            )}

            {role === "DRIVER" && (
              <>
                <Link
                  to="/driver-dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-4 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/10 transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-300"
                >
                  <Truck size={17} aria-hidden="true" />
                  {t("driver_dashboard_link")}
                </Link>
                <Link
                  to="/tracking"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-sky-300/[0.06]"
                >
                  <MapPinned size={17} className="text-sky-200" aria-hidden="true" />
                  {t("feature_tracking_title")}
                </Link>
                <Link
                  to="/vehicle"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-emerald-300/[0.06]"
                >
                  <Truck size={17} className="text-emerald-200" aria-hidden="true" />
                  {t("vehicle_title")}
                </Link>
              </>
            )}

            {role === "ADMIN" && (
              <Link
                to="/admin-dashboard"
                className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-500"
              >
                {t("admin_dashboard_link")}
              </Link>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;