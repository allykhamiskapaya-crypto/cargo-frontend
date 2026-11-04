import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleDollarSign, MapPin, Package, Route, Truck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";

const statuses = ["ALL", "PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"];
const statusStyles = {
  PENDING: "border-amber-200/25 bg-amber-200/10 text-amber-100",
  ASSIGNED: "border-sky-200/25 bg-sky-200/10 text-sky-100",
  PICKED_UP: "border-cyan-200/25 bg-cyan-200/10 text-cyan-100",
  IN_TRANSIT: "border-orange-200/25 bg-orange-200/10 text-orange-100",
  DELIVERED: "border-emerald-200/25 bg-emerald-200/10 text-emerald-100",
  CANCELLED: "border-rose-200/25 bg-rose-200/10 text-rose-100",
};
const progressStages = ["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];

function MyShipments() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "sw" ? "sw-TZ" : "en-TZ";
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }
  const [shipments, setShipments] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelNotice, setCancelNotice] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;
    const loadShipments = async () => {
      try {
        const response = await api.get(`/shipments/customer/${user.id}`);
        if (active) {
          setShipments(Array.isArray(response.data) ? response.data : []);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadShipments();
    const interval = window.setInterval(loadShipments, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user?.id]);

  const visibleShipments = useMemo(() => shipments
    .filter((shipment) => filter === "ALL" || shipment.status === filter)
    .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0)), [filter, shipments]);

  const cancelShipment = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError("");
    try {
      const response = await api.post(`/shipments/${cancelTarget.id}/cancel`);
      setShipments((current) => current.map((shipment) => (
        shipment.id === cancelTarget.id ? response.data : shipment
      )));
      setCancelTarget(null);
      setCancelNotice(t("customer_cancel_success"));
      window.setTimeout(() => setCancelNotice(""), 4500);
    } catch (requestError) {
      const message = requestError.response?.data;
      setCancelError(typeof message === "string" ? message : t("customer_cancel_error"));
    } finally {
      setCancelling(false);
    }
  };

  if (!user) return <Navigate to="/login" replace />;

  return (
    <main className="min-h-[calc(100vh-4rem)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11 lg:px-8">
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100/70">{t("shipments_eyebrow")}</p>
            <h1 className="text-3xl font-bold tracking-tight text-white">{t("dashboard_my_shipments")}</h1>
            <p className="mt-2 text-sm text-zinc-400">{t("shipments_subtitle")}</p>
          </div>
          <Link to="/booking" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-200 sm:self-auto">
            <Package size={16} aria-hidden="true" />{t("book_shipment_link")}
          </Link>
        </header>

        {cancelNotice && <div role="status" className="fixed bottom-5 right-5 z-[60] rounded-xl border border-emerald-200/25 bg-zinc-950/95 px-4 py-3 text-sm font-medium text-emerald-100 shadow-xl">{cancelNotice}</div>}

        <section className="mb-6 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3" aria-label={t("shipments_summary")}>
          <div className="bg-zinc-950/75 p-4 backdrop-blur-xl sm:p-5">
            <p className="text-xs text-zinc-400">{t("shipments_total")}</p>
            <p className="mt-2 text-2xl font-bold">{shipments.length}</p>
          </div>
          <div className="bg-zinc-950/75 p-4 backdrop-blur-xl sm:p-5">
            <p className="text-xs text-zinc-400">{t("shipments_active")}</p>
            <p className="mt-2 text-2xl font-bold text-sky-100">{shipments.filter((shipment) => !["DELIVERED", "CANCELLED"].includes(shipment.status)).length}</p>
          </div>
          <div className="bg-zinc-950/75 p-4 backdrop-blur-xl sm:p-5">
            <p className="text-xs text-zinc-400">{t("shipments_total_value")}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-amber-100"><CircleDollarSign size={19} aria-hidden="true" />TSh {shipments.reduce((total, shipment) => total + (Number(shipment.price) || 0), 0).toLocaleString(locale)}</p>
          </div>
        </section>

        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-zinc-400">{t("shipments_showing", { count: visibleShipments.length })}</p>
          <label className="flex items-center gap-3 text-sm text-zinc-400">
            <span>{t("shipments_filter")}</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-10 rounded-xl border border-white/10 bg-zinc-950/80 px-3 text-sm text-zinc-100 focus:border-amber-200/50 focus:outline-none">
              {statuses.map((status) => <option key={status} value={status}>{status === "ALL" ? t("shipments_all_statuses") : t(`driver_status_${status.toLowerCase()}`)}</option>)}
            </select>
          </label>
        </div>

        {loading ? (
          <div role="status" className="rounded-2xl border border-white/10 bg-zinc-950/65 p-8 text-sm text-zinc-300 backdrop-blur-xl">{t("dashboard_shipments_loading")}</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-rose-200/20 bg-rose-300/[0.06] p-6 text-sm text-rose-100">{t("backend_error")}</div>
        ) : visibleShipments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/65 px-5 py-12 text-center backdrop-blur-xl">
            <Package size={25} className="mx-auto text-amber-100" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold">{shipments.length ? t("shipments_no_filter_results") : t("dashboard_empty_title")}</h2>
            <p className="mt-2 text-sm text-zinc-400">{shipments.length ? t("shipments_no_filter_hint") : t("dashboard_empty_message")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleShipments.map((shipment) => {
              const stage = progressStages.indexOf(shipment.status);
              const date = shipment.createdAt ? new Date(shipment.createdAt).toLocaleDateString(locale) : t("dashboard_date_unavailable");
              return (
                <li key={shipment.id}>
                  <article className="rounded-2xl border border-white/10 bg-zinc-950/65 p-4 shadow-lg shadow-black/10 backdrop-blur-xl transition hover:border-sky-200/20 sm:p-5">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("dashboard_shipment_number", { id: shipment.id })}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[shipment.status] || "border-white/10 bg-white/5 text-zinc-300"}`}>{t(`driver_status_${String(shipment.status || "unknown").toLowerCase()}`)}</span>
                          <span className="text-xs text-zinc-500">{date}</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                          <p className="flex items-start gap-2 break-words text-sm font-medium text-white"><MapPin size={15} className="mt-0.5 shrink-0 text-emerald-200" aria-hidden="true" />{shipment.origin}</p>
                          <ArrowRight size={16} className="hidden text-zinc-600 sm:block" aria-hidden="true" />
                          <p className="flex items-start gap-2 break-words text-sm font-medium text-white"><MapPin size={15} className="mt-0.5 shrink-0 text-rose-200" aria-hidden="true" />{shipment.destination}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400">
                          <span className="inline-flex items-center gap-1.5"><Truck size={13} aria-hidden="true" />{shipment.cargoType || "—"}</span>
                          <span>{shipment.weightKg ?? "—"} kg</span>
                          {shipment.distanceKm != null && <span className="inline-flex items-center gap-1"><Route size={13} aria-hidden="true" />{shipment.distanceKm} km</span>}
                          <span className="font-semibold text-amber-100">{shipment.price == null ? t("booking_cost_pending") : `TSh ${Number(shipment.price).toLocaleString(locale)}`}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {(["PENDING", "ASSIGNED"].includes(shipment.status)) && (
                          <button type="button" onClick={() => { setCancelError(""); setCancelTarget(shipment); }} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/[0.15]">{t("customer_cancel_order")}</button>
                        )}
                        <Link to={`/tracking?id=${shipment.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-200/25 bg-sky-200/[0.08] px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-200/[0.14]">
                          {t("tracking_track_live")}<ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                    <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label={t("tracking_progress")}>
                      {progressStages.map((status, index) => {
                        const complete = stage >= index && stage >= 0;
                        return <li key={status} className="min-w-0">
                          <div className={`mb-2 h-1 rounded-full ${complete ? "bg-sky-200/75" : "bg-white/10"}`} />
                          <span className={`block truncate text-[10px] font-medium sm:text-xs ${complete ? "text-sky-100" : "text-zinc-600"}`}>{t(`tracking_timeline_${status.toLowerCase()}`)}</span>
                        </li>;
                      })}
                    </ol>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {cancelTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/75 p-2 backdrop-blur-sm sm:p-4" role="presentation">
            <section role="dialog" aria-modal="true" aria-labelledby="cancel-shipment-title" className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-2xl sm:max-w-md sm:p-6">
              <h2 id="cancel-shipment-title" className="text-lg font-semibold text-white">{t("customer_cancel_confirm")}</h2>
              <p className="mt-2 text-sm text-zinc-400">{t("dashboard_shipment_number", { id: cancelTarget.id })}: {cancelTarget.origin} → {cancelTarget.destination}</p>
              {cancelError && <p role="alert" className="mt-4 rounded-lg border border-rose-200/20 bg-rose-300/[0.07] px-3 py-2 text-sm text-rose-100">{cancelError}</p>}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={cancelling} onClick={() => setCancelTarget(null)} className="min-h-11 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50">{t("customer_cancel_back")}</button>
                <button type="button" disabled={cancelling} onClick={cancelShipment} className="min-h-11 rounded-xl bg-rose-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-rose-300 disabled:cursor-wait disabled:opacity-50">{cancelling ? t("customer_cancel_in_progress") : t("customer_cancel_yes")}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default MyShipments;