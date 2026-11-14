import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReceiptModal from "../components/ReceiptModal";
import api from "../api/axiosClient";

function Receipt() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shipmentId } = useParams();
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let currentCustomer = null;
    try {
      currentCustomer = JSON.parse(localStorage.getItem("user"));
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }

    if (!currentCustomer || currentCustomer.role !== "CUSTOMER") {
      navigate("/login", { replace: true });
      return () => { active = false; };
    }

    const loadReceipt = async () => {
      try {
        const [shipmentResponse, paymentResponse] = await Promise.all([
          api.get(`/shipments/${shipmentId}`),
          api.get(`/payments/shipment/${shipmentId}`),
        ]);
        if (!active) return;
        if (paymentResponse.data?.status !== "PAID") {
          setError(t("receipt_not_paid"));
          return;
        }
        setReceiptData({ shipment: shipmentResponse.data, payment: paymentResponse.data });
      } catch {
        if (active) setError(t("receipt_load_error"));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReceipt();
    return () => { active = false; };
  }, [navigate, shipmentId, t]);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  if (!user || user.role !== "CUSTOMER") return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-center text-sm text-zinc-300" role="status">
        {t("receipt_loading")}
      </main>
    );
  }

  if (error || !receiptData) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div role="alert" className="rounded-2xl border border-rose-200/20 bg-zinc-950/85 p-6 text-sm text-rose-100">
          <p>{error || t("receipt_load_error")}</p>
          <button type="button" onClick={() => navigate("/payment")} className="mt-5 min-h-11 rounded-xl border border-white/15 px-4 py-2 font-semibold text-white transition hover:bg-white/5">
            {t("receipt_back")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <ReceiptModal
      shipment={receiptData.shipment}
      payment={receiptData.payment}
      customer={user}
      fullPage
      onClose={() => navigate("/payment")}
    />
  );
}

export default Receipt;