import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";

const paymentMethods = ["MPESA", "TIGOPESA", "CASH", "CARD"];

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
  const [success, setSuccess] = useState("");

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

  const initiatePayment = async (shipment) => {
    const amount = Number(shipment.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t("payment_missing_amount"));
      return;
    }

    setError("");
    setSuccess("");
    setProcessingShipmentId(shipment.id);

    try {
      const response = await api.post("/payments", {
        shipmentId: shipment.id,
        amount,
        method: methods[shipment.id] || paymentMethods[0],
      });

      setShipments((currentShipments) =>
        currentShipments.map((currentShipment) =>
          currentShipment.id === shipment.id
            ? { ...currentShipment, payment: response.data }
            : currentShipment,
        ),
      );
      setSuccess(t("payment_created"));
    } catch {
      setError(t("backend_error"));
    } finally {
      setProcessingShipmentId(null);
    }
  };

  const confirmPayment = async (payment) => {
    setError("");
    setSuccess("");
    setConfirmingPaymentId(payment.id);

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
      setSuccess(t("payment_confirmed"));
    } catch {
      setError(t("backend_error"));
    } finally {
      setConfirmingPaymentId(null);
    }
  };

  if (!user || userRole !== "CUSTOMER") return null;

  const inputClass =
    "w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition";

  return (
    <div className="relative min-h-screen text-white">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold text-white mb-1">
          {t("payment_title")}
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          {t("payment_subtitle")}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 mb-5">
            {success}
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500">{t("payment_loading")}</p>
        ) : shipments.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <p className="text-zinc-400">{t("payment_no_shipments")}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {shipments.map((shipment) => {
              const payment = shipment.payment;
              const status = payment?.status;
              const amount = Number(shipment.price);
              const isProcessing = processingShipmentId === shipment.id;
              const isConfirming = confirmingPaymentId === payment?.id;

              return (
                <section
                  key={shipment.id}
                  className="py-5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <h2 className="text-white font-medium">
                        #{shipment.id}: {shipment.origin} {t("common_to")} {shipment.destination}
                      </h2>
                      <p className="text-zinc-500 text-sm mt-1">
                        {shipment.cargoType} · {t("payment_amount")}: {" "}
                        {Number.isFinite(amount)
                          ? `${amount.toLocaleString(locale)} TZS`
                          : "-"}
                      </p>
                    </div>

                    {status && (
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full border w-fit ${
                          status === "PAID"
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : status === "FAILED"
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                        }`}
                      >
                        {t(`payment_${status.toLowerCase()}`)}
                      </span>
                    )}
                  </div>

                  {!payment ? (
                    <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
                      <label className="text-zinc-400 text-sm flex-1">
                        <span className="block mb-2">{t("payment_method")}</span>
                        <select
                          value={methods[shipment.id] || paymentMethods[0]}
                          onChange={(event) =>
                            setMethods((currentMethods) => ({
                              ...currentMethods,
                              [shipment.id]: event.target.value,
                            }))
                          }
                          className={inputClass}
                        >
                          {paymentMethods.map((method) => (
                            <option key={method} value={method}>
                              {t(`payment_method_${method.toLowerCase()}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => initiatePayment(shipment)}
                        disabled={isProcessing || !Number.isFinite(amount) || amount <= 0}
                        className="min-h-11 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold rounded-lg px-5 py-2.5 text-sm transition"
                      >
                        {isProcessing ? t("payment_starting") : t("payment_start")}
                      </button>
                    </div>
                  ) : status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => confirmPayment(payment)}
                      disabled={isConfirming}
                      className="mt-4 min-h-11 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold rounded-lg px-5 py-2.5 text-sm transition"
                    >
                      {isConfirming
                        ? t("payment_confirming")
                        : t("payment_confirm")}
                    </button>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Payment;