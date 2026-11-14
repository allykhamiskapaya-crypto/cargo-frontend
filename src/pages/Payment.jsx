import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  MapPin,
  Package,
  ShieldCheck,
  Smartphone,
  WalletCards,
  X,
} from "lucide-react";
import api from "../api/axiosClient";
import ReceiptModal from "../components/ReceiptModal";

const paymentMethods = [
  { value: "MPESA", label: "payment_method_mpesa", mark: "M-PESA", icon: Smartphone, tone: "text-emerald-300", selected: "border-emerald-400/70 bg-emerald-500/10 ring-1 ring-emerald-400/30", hover: "hover:border-emerald-400/40" },
  { value: "TIGOPESA", label: "payment_method_tigopesa", mark: "TIGO PESA", icon: Smartphone, tone: "text-sky-300", selected: "border-sky-400/70 bg-sky-500/10 ring-1 ring-sky-400/30", hover: "hover:border-sky-400/40" },
  { value: "AIRTELMONEY", label: "payment_method_airtelmoney", mark: "airtel money", icon: WalletCards, tone: "text-rose-300", selected: "border-rose-400/70 bg-rose-500/10 ring-1 ring-rose-400/30", hover: "hover:border-rose-400/40" },
  { value: "CARD", label: "payment_method_card", mark: "", icon: CreditCard, tone: "text-amber-300", selected: "border-amber-400/70 bg-amber-500/10 ring-1 ring-amber-400/30", hover: "hover:border-amber-400/40" },
];

const formatAmount = (amount, locale) =>
  `${amount.toLocaleString(locale, { maximumFractionDigits: 2 })} TZS`;

function Payment() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "sw" ? "sw-TZ" : "en-TZ";
  const navigate = useNavigate();
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  const userId = user?.id;
  const userRole = user?.role;
  const [shipments, setShipments] = useState([]);
  const [methods, setMethods] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingShipmentId, setProcessingShipmentId] = useState(null);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState(null);
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState(null);
  const [receiptShipmentId, setReceiptShipmentId] = useState(null);

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    if (userRole !== "CUSTOMER") {
      navigate("/dashboard");
      return;
    }

    const loadShipments = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/shipments/customer/${userId}`);
        const shipmentList = await Promise.all(
          response.data.map(async (shipment) => {
            try {
              const paymentResponse = await api.get(
                `/payments/shipment/${shipment.id}`,
              );
              const paymentData = paymentResponse.data;
              const existingPayment = Array.isArray(paymentData)
                ? paymentData[0] || null
                : paymentData;

              return { ...shipment, payment: existingPayment };
            } catch (requestError) {
              if (requestError.response?.status === 404) {
                return { ...shipment, payment: null };
              }
              throw requestError;
            }
          }),
        );

        setShipments(shipmentList);
      } catch {
        setError(t("backend_error"));
      } finally {
        setLoading(false);
      }
    };

    loadShipments();
  }, [navigate, t, userId, userRole]);

  useEffect(() => {
    if (!completion) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setCompletion(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completion]);

  const initiatePayment = async (shipment) => {
    const amount = Number(shipment.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("payment_missing_amount"));
      return;
    }

    setError("");
    setCompletion(null);
    setProcessingShipmentId(shipment.id);

    try {
      const response = await api.post("/payments", {
        shipmentId: shipment.id,
        amount,
        method: methods[shipment.id] || paymentMethods[0].value,
      });

      setShipments((currentShipments) =>
        currentShipments.map((currentShipment) =>
          currentShipment.id === shipment.id
            ? { ...currentShipment, payment: response.data }
            : currentShipment,
        ),
      );
      setCompletion({ kind: "created", shipmentId: shipment.id, amount });
    } catch {
      setError(t("backend_error"));
    } finally {
      setProcessingShipmentId(null);
    }
  };

  const confirmPayment = async (payment) => {
    setError("");
    setCompletion(null);
    setConfirmingPaymentId(payment.id);
    const shipment = shipments.find(
      (currentShipment) => currentShipment.payment?.id === payment.id,
    );

    try {
      const response = await api.put(`/payments/${payment.id}/confirm`);
      const updatedPayment = response.data || { ...payment, status: "PAID" };

      setShipments((currentShipments) =>
        currentShipments.map((shipment) =>
          shipment.payment?.id === payment.id
            ? { ...shipment, payment: updatedPayment }
            : shipment,
        ),
      );
      setCompletion({
        kind: "paid",
        shipmentId: shipment?.id,
        amount: Number(updatedPayment.amount),
      });
    } catch {
      setError(t("backend_error"));
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  if (!user || userRole !== "CUSTOMER") return null;

  const outstandingTotal = shipments.reduce((total, shipment) => {
    if (shipment.payment?.status === "PAID") return total;
    const amount = Number(shipment.price);
    return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);

  const closeCompletion = () => setCompletion(null);
  const receiptShipment = shipments.find((shipment) => shipment.id === receiptShipmentId);

  return (
    <div className="relative min-h-screen text-white">
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-7 flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
              {t("payment_eyebrow")}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t("payment_title")}
        </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          {t("payment_subtitle")}
        </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs font-medium text-emerald-200">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            {t("payment_secure")}
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {!loading && shipments.length > 0 && (
          <section aria-label={t("payment_overview")} className="mb-7 grid grid-cols-2 gap-4 sm:max-w-xl sm:gap-10">
            <div className="border-l-2 border-amber-300 pl-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{t("payment_outstanding")}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-white">{formatAmount(outstandingTotal, locale)}</p>
            </div>
            <div className="border-l-2 border-sky-300 pl-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{t("payment_shipments_count")}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-white">{shipments.length}</p>
            </div>
          </section>
        )}

        {loading ? (
          <div role="status" className="space-y-4" aria-label={t("payment_loading")}>
            {[0, 1].map((item) => (
              <div key={item} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-zinc-950/70" />
            ))}
          </div>
        ) : shipments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 px-5 py-14 text-center shadow-xl shadow-black/20">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300">
              <Package aria-hidden="true" className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-white">{t("payment_empty_title")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">{t("payment_no_shipments")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shipments.map((shipment) => {
              const payment = shipment.payment;
              const status = payment?.status;
              const amount = Number(shipment.price);
              const isProcessing = processingShipmentId === shipment.id;
              const isConfirming = confirmingPaymentId === payment?.id;
              const selectedMethod = methods[shipment.id] || paymentMethods[0].value;
              const existingMethod = paymentMethods.find(
                (method) => method.value === payment?.method,
              );
              const statusClass = status === "PAID"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                : status === "FAILED"
                  ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                  : "border-amber-300/30 bg-amber-300/10 text-amber-100";

              return (
                <section
                  key={shipment.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-xl shadow-black/20 backdrop-blur-sm"
                >
                  <div className="flex flex-col gap-5 p-4 sm:p-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/10 text-sky-200">
                        <MapPin aria-hidden="true" className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          {t("payment_shipment_ref", { id: shipment.id })}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-white sm:text-lg">
                          <span>{shipment.origin}</span>
                          <ArrowRight aria-hidden="true" className="h-4 w-4 text-zinc-500" />
                          <span>{shipment.destination}</span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{shipment.cargoType}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4 md:min-w-48 md:flex-col md:items-end md:border-0 md:pt-0">
                      <div className="md:text-right">
                        <p className="text-xs text-zinc-400">{t("payment_amount")}</p>
                        <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
                          {Number.isFinite(amount) ? formatAmount(amount, locale) : "-"}
                        </p>
                      </div>
                      {status && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass}`}>
                          {status === "PAID" && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                          {t(`payment_${status.toLowerCase()}`)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-black/15 p-4 sm:p-6">
                  {!payment ? (
                    <>
                      <fieldset>
                        <legend className="mb-3 text-sm font-semibold text-zinc-200">
                          {t("payment_method")}
                        </legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {paymentMethods.map((method) => {
                            const Icon = method.icon;
                            const isSelected = selectedMethod === method.value;
                            return (
                              <label
                                key={method.value}
                                className={`relative flex min-h-20 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-amber-300 ${
                                  isSelected
                                    ? method.selected
                                    : `border-white/10 bg-zinc-900/50 ${method.hover}`
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`payment-method-${shipment.id}`}
                                  value={method.value}
                                  checked={isSelected}
                                  onChange={() => setMethods((currentMethods) => ({
                                    ...currentMethods,
                                    [shipment.id]: method.value,
                                  }))}
                                  className="peer sr-only"
                                />
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/20 ${method.tone}`}>
                                  <Icon aria-hidden="true" className="h-5 w-5" />
                                </span>
                                <span className="min-w-0">
                                  {method.mark && (
                                    <span className={`block truncate text-[10px] font-bold tracking-wide ${method.tone}`}>
                                      {method.mark}
                                    </span>
                                  )}
                                  <span className={`${method.mark ? "mt-0.5 text-xs" : "text-sm"} block font-medium leading-4 text-zinc-200`}>
                                    {t(method.label)}
                                  </span>
                                </span>
                                {isSelected && (
                                  <Check aria-hidden="true" className={`absolute right-2 top-2 h-3.5 w-3.5 ${method.tone}`} />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>

                      <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs text-zinc-400">{t("payment_total_due")}</p>
                          <p className="mt-0.5 text-xl font-bold tabular-nums text-white">
                            {Number.isFinite(amount) ? formatAmount(amount, locale) : "-"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => initiatePayment(shipment)}
                          disabled={isProcessing || !Number.isFinite(amount) || amount <= 0}
                          aria-busy={isProcessing}
                          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {isProcessing ? (
                            <>
                              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                              {t("payment_starting")}
                            </>
                          ) : (
                            <>
                              {t("payment_start")}
                              <ArrowRight aria-hidden="true" className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  ) : status === "PENDING" ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-300/10 text-amber-100">
                          <Banknote aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {t("payment_method")}: {existingMethod ? t(existingMethod.label) : payment.method === "CASH" ? t("payment_method_cash") : payment.method}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-zinc-400">{t("payment_pending_hint")}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => confirmPayment(payment)}
                        disabled={isConfirming}
                        aria-busy={isConfirming}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {isConfirming && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                        {isConfirming ? t("payment_confirming") : t("payment_confirm")}
                      </button>
                    </div>
                  ) : status === "PAID" ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-200">
                          <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {t("payment_method")}: {existingMethod ? t(existingMethod.label) : payment.method === "CASH" ? t("payment_method_cash") : payment.method}
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">{t("payment_confirmed")}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptShipmentId(shipment.id)}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 sm:w-auto"
                      >
                        {t("receipt_view")}
                      </button>
                    </div>
                  ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {receiptShipment?.payment && (
        <ReceiptModal
          shipment={receiptShipment}
          payment={receiptShipment.payment}
          customer={user}
          onClose={() => setReceiptShipmentId(null)}
        />
      )}

      {completion && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeCompletion}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-completion-title"
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/50 sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label={t("payment_modal_close")}
              onClick={closeCompletion}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
              <CheckCircle2 aria-hidden="true" className="h-7 w-7" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
              {t("payment_confirmation_eyebrow")}
            </p>
            <h2 id="payment-completion-title" className="mt-2 text-2xl font-bold text-white">
              {t(completion.kind === "paid" ? "payment_modal_paid_title" : "payment_modal_created_title")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {t(completion.kind === "paid" ? "payment_modal_paid_body" : "payment_modal_created_body", {
                id: completion.shipmentId,
                amount: formatAmount(completion.amount, locale),
              })}
            </p>
            <button
              type="button"
              autoFocus
              onClick={closeCompletion}
              className="mt-7 min-h-11 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              {t("payment_modal_done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payment;