import { lazy, Suspense, useState, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Clock3, Copy, MessageCircle, Navigation, Package, Phone, Truck } from "lucide-react";
import api from "../api/axiosClient";
import { isValidUpload } from "../utils/uploadValidation";

const LiveShipmentMap = lazy(() => import("../components/LiveShipmentMap"));

const statusColors = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  ASSIGNED: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  PICKED_UP: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  IN_TRANSIT: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  DELIVERED: "bg-green-500/10 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/30",
};

const trackingTimeline = ["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED"];

function getWhatsAppUrl(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith("0") ? `255${digits.slice(1)}` : digits}`;
}

function getErrorMessage(error, fallback) {
  const message = error?.response?.data?.message
    || (typeof error?.response?.data === "string" ? error.response.data : "")
    || error?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function Tracking() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "sw" ? "sw-TZ" : "en-TZ";
  const navigate = useNavigate();
  const { shipmentId: pathShipmentId } = useParams();
  const [searchParams] = useSearchParams();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }
  const userId = user?.id;
  const shipmentIdParam = searchParams.get("shipmentId") || searchParams.get("id") || pathShipmentId;
  const requestedShipmentId = shipmentIdParam ? Number(shipmentIdParam) : null;

  const [shipments, setShipments] = useState([]);
  const [shipmentDetailResult, setShipmentDetailResult] = useState(null);
  const [shipmentDetailFailure, setShipmentDetailFailure] = useState(null);
  const [driverInfoResult, setDriverInfoResult] = useState(null);
  const [driverInfoFailure, setDriverInfoFailure] = useState(null);
  const [historyResult, setHistoryResult] = useState(null);
  const [historyFailure, setHistoryFailure] = useState(null);
  const [deliveryCode, setDeliveryCode] = useState(null);
  const [deliveryCodeCopied, setDeliveryCodeCopied] = useState(false);
  const [deliveryCodeLoading, setDeliveryCodeLoading] = useState(false);
  const [deliveryCodeError, setDeliveryCodeError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [complaintText, setComplaintText] = useState("");
  const [complaintEvidence, setComplaintEvidence] = useState(null);
  const [complaintError, setComplaintError] = useState("");
  const [complaintSuccess, setComplaintSuccess] = useState("");
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [myComplaints, setMyComplaints] = useState([]);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    let isActive = true;
    const loadShipments = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError("");
      try {
        const response = await api.get(`/shipments/customer/${userId}`);
        const data = response?.data;
        if (isActive) setShipments(Array.isArray(data) ? data.filter(Boolean) : []);
      } catch {
        if (isActive) setError(t("backend_error"));
      } finally {
        if (isActive && showLoading) setLoading(false);
      }
    };

    loadShipments(true);
    const refreshInterval = window.setInterval(() => loadShipments(), 15000);
    return () => {
      isActive = false;
      window.clearInterval(refreshInterval);
    };
  }, [navigate, t, userId]);

  const activeShipmentId = Number.isSafeInteger(requestedShipmentId) && requestedShipmentId > 0
    ? requestedShipmentId : null;
  useEffect(() => {
    if (!activeShipmentId) return undefined;
    let isActive = true;
    const loadShipmentDetail = async () => {
      try {
        const response = await api.get(`/shipments/${activeShipmentId}`);
        if (!isActive) return;
        const shipment = response?.data;
        if (!shipment || Number(shipment.id) !== activeShipmentId) {
          setShipmentDetailFailure({
            shipmentId: activeShipmentId,
            message: t("tracking_shipment_unavailable"),
          });
          return;
        }
        setShipmentDetailResult({ shipmentId: activeShipmentId, data: shipment });
        setShipmentDetailFailure(null);
      } catch (requestError) {
        if (!isActive) return;
        const status = requestError?.response?.status;
        const message = status === 401 || status === 403 || status === 404
          ? t("tracking_shipment_unavailable")
          : getErrorMessage(requestError, t("backend_error"));
        setShipmentDetailFailure({ shipmentId: activeShipmentId, message });
      }
    };
    loadShipmentDetail();
    const refreshInterval = window.setInterval(loadShipmentDetail, 15000);
    return () => {
      isActive = false;
      window.clearInterval(refreshInterval);
    };
  }, [activeShipmentId, t]);

  const shipmentDetail = shipmentDetailResult?.shipmentId === activeShipmentId
    ? shipmentDetailResult?.data ?? null : null;
  const shipmentDetailError = shipmentDetailFailure?.shipmentId === activeShipmentId
    && typeof shipmentDetailFailure?.message === "string"
    ? shipmentDetailFailure?.message : "";
  const shipmentDetailLoading = Boolean(activeShipmentId) && !shipmentDetail && !shipmentDetailError;
  const selectedShipment = shipmentDetail
    || shipments.find((shipment) => Number(shipment?.id) === activeShipmentId);
  const displayedShipments = selectedShipment
    && !shipments.some((shipment) => Number(shipment?.id) === Number(selectedShipment.id))
    ? [selectedShipment, ...shipments]
    : shipments;
  const selectedShipmentId = selectedShipment?.id;
  const selectedStatus = selectedShipment?.status;
  const history = historyResult?.shipmentId === Number(selectedShipmentId)
    && Array.isArray(historyResult?.data) ? historyResult?.data ?? [] : [];
  const historyError = historyFailure?.shipmentId === selectedShipmentId
    && typeof historyFailure?.message === "string"
    ? historyFailure?.message : "";
  const historyLoading = Boolean(selectedShipmentId) && !historyError
    && historyResult?.shipmentId !== selectedShipmentId;
  const hasAssignedDriver = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(selectedStatus);
  const driverInfo = driverInfoResult?.shipmentId === selectedShipmentId
    ? driverInfoResult?.data ?? null : null;
  const driverInfoError = driverInfoFailure?.shipmentId === selectedShipmentId
    && typeof driverInfoFailure?.message === "string"
    ? driverInfoFailure?.message : "";
  const driverInfoLoading = hasAssignedDriver && !driverInfo
    && !driverInfoError && driverInfoResult?.shipmentId !== selectedShipmentId;
  const visibleDeliveryCode = hasAssignedDriver
    ? deliveryCode
    : null;

  useEffect(() => {
    if (!selectedShipmentId || !hasAssignedDriver) return undefined;

    let isActive = true;
    api.get(`/shipments/${selectedShipmentId}/driver-info`)
      .then((response) => {
        if (isActive) {
          const data = response?.data;
          if (data && typeof data === "object") {
            setDriverInfoResult({ shipmentId: selectedShipmentId, data });
            setDriverInfoFailure(null);
          } else {
            setDriverInfoFailure({
              shipmentId: selectedShipmentId,
              message: t("tracking_driver_info_error"),
            });
          }
        }
      })
      .catch(() => {
        if (isActive) {
          setDriverInfoFailure({
            shipmentId: selectedShipmentId,
            message: t("tracking_driver_info_error"),
          });
        }
      });

    return () => { isActive = false; };
  }, [hasAssignedDriver, selectedShipmentId, t]);

  useEffect(() => {
    if (!selectedShipmentId) return undefined;

    let isActive = true;
    api.get(`/shipments/${selectedShipmentId}/tracking`)
      .then((response) => {
        if (isActive) {
          const data = response?.data;
          if (Array.isArray(data)) {
            setHistoryResult({ shipmentId: selectedShipmentId, data: data.filter(Boolean) });
            setHistoryFailure(null);
          } else {
            setHistoryFailure({ shipmentId: selectedShipmentId, message: t("backend_error") });
          }
        }
      })
      .catch(() => {
        if (isActive) {
          setHistoryFailure({ shipmentId: selectedShipmentId, message: t("backend_error") });
        }
      });
    return () => { isActive = false; };
  }, [selectedShipmentId, t]);

  const viewTracking = (shipment) => {
    setDeliveryCode(null);
    setDeliveryCodeCopied(false);
    navigate(`/tracking?id=${shipment.id}`);
  };

  const copyDeliveryCode = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(visibleDeliveryCode.code);
      setDeliveryCodeCopied(true);
    } catch {
      setError(t("tracking_code_copy_error"));
    }
  };

  const cancelShipment = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError("");
    try {
      const response = await api.post(`/shipments/${cancelTarget.id}/cancel`);
      setShipments((current) => current.map((shipment) => (
        shipment.id === cancelTarget.id ? response.data : shipment
      )));
      setShipmentDetailResult({ shipmentId: Number(cancelTarget.id), data: response.data });
      setDeliveryCode(null);
      setCancelTarget(null);
      setCancelSuccess(true);
      window.setTimeout(() => setCancelSuccess(false), 4500);
    } catch (requestError) {
      setCancelError(getErrorMessage(requestError, t("customer_cancel_error")));
    } finally {
      setCancelling(false);
    }
  };

  const generateDeliveryCode = async (event, shipmentId) => {
    event.stopPropagation();
    setDeliveryCodeLoading(true);
    setDeliveryCodeError("");
    try {
      const response = await api.post(`/shipments/${shipmentId}/delivery-code`);
      setDeliveryCode(response?.data ?? null);
      setDeliveryCodeCopied(false);
    } catch (requestError) {
      setDeliveryCodeError(getErrorMessage(requestError, t("customer_delivery_code_error")));
    } finally {
      setDeliveryCodeLoading(false);
    }
  };

  const submitComplaint = async (event, shipmentId) => {
    event.preventDefault();
    if (!complaintText.trim()) {
      setComplaintError(t("tracking_complaint_required"));
      return;
    }
    if (complaintEvidence && !isValidUpload(complaintEvidence, [
      "application/pdf", "image/jpeg", "image/png", "image/webp",
    ])) {
      setComplaintError(t("tracking_evidence_invalid"));
      return;
    }
    const formData = new FormData();
    formData.append("complaint", new Blob(
      [JSON.stringify({ shipmentId, description: complaintText.trim() })],
      { type: "application/json" },
    ));
    if (complaintEvidence) formData.append("evidence", complaintEvidence);
    setComplaintSubmitting(true);
    setComplaintError("");
    setComplaintSuccess("");
    try {
      const response = await api.post("/complaints", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!response?.data || typeof response.data !== "object") {
        throw new Error(t("backend_error"));
      }
      setMyComplaints((current) => [response.data, ...current]);
      setComplaintText("");
      setComplaintEvidence(null);
      setComplaintSuccess(t("tracking_complaint_success"));
    } catch (requestError) {
      setComplaintError(getErrorMessage(requestError, t("backend_error")));
    } finally {
      setComplaintSubmitting(false);
    }
  };

  useEffect(() => {
    if (!userId) return undefined;
    let isActive = true;
    api.get("/complaints")
      .then((response) => {
        if (isActive) setMyComplaints(Array.isArray(response?.data) ? response.data.filter(Boolean) : []);
      })
      .catch(() => {
        if (isActive) setComplaintError(t("tracking_complaint_history_error"));
      });
    return () => { isActive = false; };
  }, [t, userId]);

  const getPreviousComplaintStatus = (shipmentId) => {
    const complaint = myComplaints.find((item) => item.shipmentId === shipmentId);
    return complaint
      ? t(`complaint_status_${String(complaint.status).toLowerCase()}`, { defaultValue: complaint.status })
      : t("tracking_status_unknown");
  };

  if (!user) return null;

  return (
    <div className="relative min-h-screen text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-8 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/15 bg-sky-300/[0.08] text-sky-200">
            <Navigation size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/70">{t("tracking_eyebrow")}</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{t("tracking_title")}</h1>
            <p className="mt-1 text-sm text-zinc-400">{t("tracking_subtitle")}</p>
          </div>
        </header>

        {typeof error === "string" && error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}
        {cancelSuccess && <div role="status" className="fixed bottom-5 right-5 z-[60] rounded-xl border border-emerald-200/25 bg-zinc-950/95 px-4 py-3 text-sm font-medium text-emerald-100 shadow-xl">{t("customer_cancel_success")}</div>}

        {loading || shipmentDetailLoading ? (
          <div role="status" className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 px-5 py-6 text-sm text-zinc-300">
            <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-300" />
            {t("tracking_shipment_loading")}
          </div>
        ) : shipmentDetailError ? (
          <div role="alert" className="rounded-3xl border border-red-500/25 bg-red-500/[0.07] p-8 text-center shadow-xl backdrop-blur-xl">
            <p className="text-base font-medium text-red-200">{shipmentDetailError}</p>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
            >
              {t("tracking_back_to_dashboard")}
            </Link>
          </div>
        ) : displayedShipments.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center shadow-xl backdrop-blur-xl">
            <p className="text-zinc-300">{t("tracking_select_shipment_fallback")}</p>
            <p className="mt-2 text-sm text-zinc-500">{t("no_shipments")}</p>
            <Link
              to="/dashboard"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300"
            >
              {t("tracking_back_to_dashboard")}
            </Link>
          </div>
        ) : (
          <>
            {!selectedShipment && (
              <div className="mb-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 backdrop-blur-xl sm:flex-row sm:items-center">
                <p className="text-sm text-amber-100">{t("tracking_select_shipment_fallback")}</p>
                <Link
                  to="/dashboard"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/10"
                >
                  {t("tracking_back_to_dashboard")}
                </Link>
              </div>
            )}
            <div className="grid gap-5">
              {displayedShipments.map((s) => (
                <div
                  key={s?.id}
                  onClick={() => viewTracking(s)}
                  className={`cursor-pointer rounded-3xl border bg-gradient-to-br from-white/[0.045] to-zinc-950/70 p-5 shadow-xl shadow-black/10 backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 sm:p-6 ${
                    Number(selectedShipmentId) === Number(s?.id)
                      ? "border-sky-300/30 shadow-sky-950/10"
                      : "border-white/[0.08] hover:border-white/15"
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("dashboard_shipment_number", { id: s?.id })}</p>
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wider text-zinc-500">{t("origin")}</p>
                          <p className="mt-1 break-words font-medium text-white">{s?.origin || "—"}</p>
                        </div>
                        <ArrowRight size={17} className="hidden text-zinc-600 sm:block" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wider text-zinc-500">{t("destination")}</p>
                          <p className="mt-1 break-words font-medium text-white">{s?.destination || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        statusColors[s?.status] || "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      {s?.status ? t(`driver_status_${String(s.status).toLowerCase()}`, { defaultValue: s.status }) : t("tracking_status_unknown")}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
                    <span className="inline-flex items-center gap-1.5"><Package size={14} className="text-zinc-500" aria-hidden="true" />{s?.cargoType || "—"}</span>
                    <span>{s?.weightKg ?? "—"} kg</span>
                    {s?.price != null && <span>{Number(s.price).toLocaleString(locale)} TZS</span>}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {["PENDING", "ASSIGNED"].includes(s?.status) && (
                      <button type="button" onClick={(event) => { event.stopPropagation(); setCancelError(""); setCancelTarget(s); }} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/[0.15]">{t("customer_cancel_order")}</button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        viewTracking(s);
                      }}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-sky-200"
                    >
                      <Navigation size={15} aria-hidden="true" />
                      {t("tracking_track_live")}
                    </button>
                  </div>

                {Number(selectedShipmentId) === Number(s?.id) && (
                  <div className="mt-6 space-y-6 border-t border-white/[0.08] pt-6" onClick={(event) => event.stopPropagation()}>
                    {cancelTarget?.id === s?.id && (
                      <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/75 p-2 backdrop-blur-sm sm:p-4" role="presentation">
                        <section role="dialog" aria-modal="true" aria-labelledby="tracking-cancel-title" className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-2xl sm:max-w-md sm:p-6">
                          <h2 id="tracking-cancel-title" className="text-lg font-semibold text-white">{t("customer_cancel_confirm")}</h2>
                          <p className="mt-2 text-sm text-zinc-400">{t("dashboard_shipment_number", { id: s.id })}: {s.origin} → {s.destination}</p>
                          {cancelError && <p role="alert" className="mt-4 rounded-lg border border-rose-200/20 bg-rose-300/[0.07] px-3 py-2 text-sm text-rose-100">{cancelError}</p>}
                          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" disabled={cancelling} onClick={() => setCancelTarget(null)} className="min-h-11 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50">{t("customer_cancel_back")}</button>
                            <button type="button" disabled={cancelling} onClick={cancelShipment} className="min-h-11 rounded-xl bg-rose-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-rose-300 disabled:cursor-wait disabled:opacity-50">{cancelling ? t("customer_cancel_in_progress") : t("customer_cancel_yes")}</button>
                          </div>
                        </section>
                      </div>
                    )}
                    <section className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:p-5">
                      <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
                        <Clock3 size={16} className="text-sky-200" aria-hidden="true" />
                        {t("tracking_progress")}
                      </h3>
                      <ol className="grid gap-4 sm:grid-cols-4">
                        {trackingTimeline.map((status, index) => {
                          const statusIndex = trackingTimeline.indexOf(selectedStatus);
                          const completed = statusIndex >= index && statusIndex >= 0;
                          const historyEntry = [...history].reverse().find((entry) => (
                            entry?.status === status
                            || (status === "IN_TRANSIT" && entry?.status === "PICKED_UP")
                          ));
                          return (
                            <li key={status} className="relative flex gap-3 sm:flex-col sm:gap-2">
                              {index < trackingTimeline.length - 1 && (
                                <span className={`absolute left-[11px] top-6 h-[calc(100%+0.5rem)] w-px sm:left-6 sm:top-3 sm:h-px sm:w-[calc(100%+0.75rem)] ${
                                  completed && statusIndex > index ? "bg-sky-300/50" : "bg-white/10"
                                }`} />
                              )}
                              <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                completed ? "border-sky-200/40 bg-sky-300 text-zinc-950" : "border-white/15 bg-zinc-900 text-zinc-500"
                              }`}>
                                {completed ? <Check size={13} aria-hidden="true" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                              </span>
                              <div className="min-w-0 pb-3 sm:pb-0">
                                <p className={`text-xs font-semibold ${completed ? "text-zinc-100" : "text-zinc-500"}`}>
                                  {t(`tracking_timeline_${status.toLowerCase()}`)}
                                </p>
                                <p className="mt-1 text-[11px] text-zinc-500">
                                  {historyEntry?.timestamp
                                    ? new Date(historyEntry.timestamp).toLocaleString(locale)
                                    : completed ? t("tracking_status_complete") : t("tracking_status_upcoming")}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                    {hasAssignedDriver && (
                      <section
                        className="rounded-2xl border border-sky-300/15 bg-gradient-to-br from-sky-300/[0.07] to-transparent p-4 shadow-lg shadow-black/10 sm:p-5"
                        aria-label={t("tracking_driver_info")}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-sky-100">
                          <Truck size={17} aria-hidden="true" />{t("tracking_driver_info")}
                        </h3>
                        {driverInfoLoading ? (
                          <p className="text-sm text-zinc-400">{t("loading")}</p>
                        ) : driverInfoError ? (
                          <p role="alert" className="text-sm text-amber-200">{driverInfoError}</p>
                        ) : driverInfo ? (
                          <>
                          <dl className="grid gap-3 text-sm sm:grid-cols-3">
                            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-3">
                              <dt className="text-xs text-zinc-500">{t("tracking_driver_name")}</dt>
                              <dd className="mt-1 font-medium text-white">{driverInfo.driverName || t("tracking_driver_info_unavailable")}</dd>
                            </div>
                            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-3">
                              <dt className="text-xs text-zinc-500">{t("tracking_driver_phone")}</dt>
                              <dd className="mt-1 font-medium text-white">
                                {driverInfo.phoneNumber ? (
                                  <a href={`tel:${driverInfo.phoneNumber}`} className="hover:text-sky-200">
                                    {driverInfo.phoneNumber}
                                  </a>
                                ) : t("tracking_driver_info_unavailable")}
                              </dd>
                            </div>
                            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-3">
                              <dt className="text-xs text-zinc-500">{t("tracking_vehicle_registration")}</dt>
                              <dd className="mt-1 font-medium text-white">{driverInfo.vehicleRegistrationNumber || t("tracking_driver_info_unavailable")}</dd>
                            </div>
                          </dl>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {driverInfo.phoneNumber && (
                              <a href={`tel:${driverInfo.phoneNumber}`} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-3.5 py-2.5 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-emerald-200">
                                <Phone size={15} aria-hidden="true" />{t("tracking_call_driver")}
                              </a>
                            )}
                            {getWhatsAppUrl(driverInfo.phoneNumber) && (
                              <a href={getWhatsAppUrl(driverInfo.phoneNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-3.5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-300/10">
                                <MessageCircle size={15} aria-hidden="true" />{t("tracking_message_driver")}
                              </a>
                            )}
                          </div>
                          </>
                        ) : (
                          <p className="text-sm text-zinc-400">{t("tracking_driver_info_unavailable")}</p>
                        )}
                      </section>
                    )}
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/50 p-2 shadow-2xl shadow-black/20 sm:p-3">
                      <Suspense fallback={<p className="py-4 text-sm text-zinc-400">{t("shipment_map_loading")}</p>}>
                        <LiveShipmentMap shipment={s} />
                      </Suspense>
                    </div>
                    {hasAssignedDriver && (
                      <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.045] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
                        <div>
                          <h3 className="text-sm font-semibold text-amber-100">{t("customer_generate_delivery_pin")}</h3>
                          <p className="mt-1 text-xs leading-5 text-zinc-400">{t("customer_delivery_code_help")}</p>
                        </div>
                        <button type="button" disabled={deliveryCodeLoading} onClick={(event) => generateDeliveryCode(event, s.id)} className="mt-3 inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-100 disabled:cursor-wait disabled:opacity-60 sm:mt-0 sm:w-auto">
                          {deliveryCodeLoading ? t("customer_delivery_code_generating") : t("customer_generate_delivery_pin")}
                        </button>
                        {deliveryCodeError && <p role="alert" className="mt-3 text-sm text-rose-200 sm:col-span-2">{deliveryCodeError}</p>}
                      </section>
                    )}
                    {visibleDeliveryCode?.code && (
                      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-amber-300/30 bg-amber-300/[0.09] p-4 shadow-lg shadow-amber-950/10 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div>
                          <p className="text-sm font-semibold text-amber-100">{t("customer_delivery_code")}</p>
                          <p className="mt-1 text-3xl font-bold tracking-[0.25em] text-amber-200" aria-label={t("customer_delivery_code")}>{visibleDeliveryCode.code}</p>
                          <p className="mt-2 text-xs leading-5 text-zinc-300">{t("customer_delivery_code_help")}</p>
                        </div>
                        <button type="button" onClick={copyDeliveryCode} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-200/25 bg-zinc-950/50 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-zinc-950/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
                          <Copy size={16} aria-hidden="true" />{deliveryCodeCopied ? t("customer_delivery_code_copied") : t("customer_delivery_code_copy")}
                        </button>
                      </div>
                    )}
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                      <Clock3 size={15} className="text-sky-200" aria-hidden="true" />
                      {t("tracking_history")}
                    </h4>
                    {historyLoading ? (
                      <p className="text-zinc-500 text-sm">{t("loading")}</p>
                    ) : historyError ? (
                      <p className="text-red-400 text-sm">{historyError}</p>
                    ) : history.length === 0 ? (
                      <p className="text-zinc-500 text-sm">{t("no_history")}</p>
                    ) : (
                      <ul className="space-y-3">
                        {history.map((h, index) => (
                              <li key={h?.id ?? `${h?.timestamp ?? "tracking"}-${index}`} className="flex items-start gap-3 text-sm">
                            <span className="w-2 h-2 mt-1.5 rounded-full bg-green-500 flex-shrink-0" />
                            <div>
                                  <span className="text-white font-medium">{h?.status || t("tracking_status_unknown")}</span>
                                  {h?.location && (
                                <span className="text-zinc-500"> — {h.location}</span>
                              )}
                                  {h?.latitude != null && h?.longitude != null && (
                                <a
                                  href={`https://maps.google.com/?q=${h.latitude},${h.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-2 text-amber-400 hover:text-amber-300"
                                >
                                  {Number(h.latitude).toFixed(5)}, {Number(h.longitude).toFixed(5)}
                                </a>
                              )}
                              {h?.timestamp && <div className="text-zinc-600 text-xs">
                                {new Date(h.timestamp).toLocaleString(locale)}
                              </div>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <form
                      className="mt-6 border-t border-zinc-800 pt-5"
                      onClick={(event) => event.stopPropagation()}
                      onSubmit={(event) => submitComplaint(event, s?.id)}
                    >
                      <h4 className="text-sm font-semibold text-zinc-300">{t("tracking_report_issue")}</h4>
                      {complaintError && <p role="alert" className="mt-2 text-sm text-red-300">{complaintError}</p>}
                      {complaintSuccess && <p role="status" className="mt-2 text-sm text-emerald-300">{complaintSuccess}</p>}
                      <textarea
                        required
                        maxLength={2000}
                        value={complaintText}
                        onChange={(event) => setComplaintText(event.target.value)}
                        placeholder={t("tracking_complaint_placeholder")}
                        className="mt-3 min-h-24 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                      />
                      <label className="mt-3 block text-xs text-zinc-400">
                        {t("tracking_evidence_optional")}
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setComplaintEvidence(file);
                            setComplaintError(file && !isValidUpload(file, [
                              "application/pdf", "image/jpeg", "image/png", "image/webp",
                            ]) ? t("tracking_evidence_invalid") : "");
                          }}
                          className="mt-2 block w-full text-sm"
                        />
                      </label>
                      <button type="submit" disabled={complaintSubmitting}
                        className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">
                        {complaintSubmitting ? t("tracking_complaint_submitting") : t("tracking_complaint_submit")}
                      </button>
                      {myComplaints.filter((complaint) => complaint.shipmentId === s?.id).length > 0 && (
                        <p className="mt-3 text-xs text-zinc-400">
                          {t("tracking_previous_complaint")}: {getPreviousComplaintStatus(s?.id)}
                        </p>
                      )}
                    </form>
                  </div>
                )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Tracking;