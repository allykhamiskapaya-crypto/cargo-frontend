import { useRef, useState } from "react";
import { ArrowLeft, Check, Download, LayoutDashboard, Mail, MapPin, Package, Phone, Printer, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import bebaLogo from "../assets/beba_logo.png";
import "./Receipt.css";

const BASE_FARE = 5000;

function ReceiptModal({ shipment, payment, customer, onClose, fullPage = false }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const receiptRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const locale = i18n.language === "sw" ? "sw-TZ" : "en-TZ";
  const total = Number(payment?.amount ?? shipment?.price);
  const safeTotal = Number.isFinite(total) ? total : 0;
  const baseFare = Math.min(BASE_FARE, safeTotal);
  const distanceFee = Math.max(0, safeTotal - baseFare);
  const paymentDate = payment?.paidAt || shipment?.updatedAt || shipment?.createdAt;
  const parsedDate = paymentDate ? new Date(paymentDate) : null;
  const dateIsValid = parsedDate && !Number.isNaN(parsedDate.getTime());
  const year = dateIsValid ? parsedDate.getFullYear() : new Date().getFullYear();
  const reference = payment?.transactionRef || `RCP-${year}-${String(payment?.id || shipment?.id || 0).padStart(4, "0")}`;
  const methodKey = `payment_method_${String(payment?.method || "").toLowerCase()}`;
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
  const supportPhone = import.meta.env.VITE_SUPPORT_PHONE;
  const currency = (amount) => new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
  const dateLabel = dateIsValid
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(parsedDate)
    : t("receipt_date_unavailable");

  const downloadPdf = async () => {
    if (!receiptRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadError("");

    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const images = Array.from(receiptRef.current.querySelectorAll("img"));
      await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
      const { default: html2pdf } = await import("html2pdf.js");

      const safeReference = reference.replace(/^#/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      await html2pdf()
        .set({
          margin: [10, 12, 10, 12],
          filename: `Beba_Cargo_Receipt_${safeReference}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            backgroundColor: "#ffffff",
            scale: 2,
            useCORS: true,
            windowWidth: 850,
            onclone: (clonedDocument) => {
              const paper = clonedDocument.querySelector(".receipt-paper");
              if (paper) {
                paper.style.width = "850px";
                paper.style.maxWidth = "850px";
                paper.style.boxSizing = "border-box";
              }
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(receiptRef.current)
        .save();
    } catch {
      setDownloadError(t("receipt_pdf_error"));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={fullPage ? "receipt-page" : "receipt-overlay"}>
      <section
        role={fullPage ? undefined : "dialog"}
        aria-modal={fullPage ? undefined : "true"}
        aria-labelledby="receipt-title"
        className="receipt-shell"
      >
        <div className="receipt-actions">
          {onClose && (
            <button type="button" onClick={onClose} className="receipt-action receipt-action-secondary">
              {fullPage ? <ArrowLeft aria-hidden="true" size={17} /> : <X aria-hidden="true" size={17} />}
              {t(fullPage ? "receipt_back" : "receipt_close")}
            </button>
          )}
          <button type="button" onClick={() => navigate("/dashboard")} className="receipt-action receipt-action-secondary">
            <LayoutDashboard aria-hidden="true" size={17} />
            {t("receipt_dashboard")}
          </button>
          <div className="receipt-action-group">
            <button type="button" onClick={() => window.print()} className="receipt-action receipt-action-secondary">
              <Printer aria-hidden="true" size={17} />
              {t("receipt_print")}
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={isDownloading}
              aria-busy={isDownloading}
              className="receipt-action receipt-action-primary"
            >
              {isDownloading ? <Printer aria-hidden="true" size={17} className="receipt-spin" /> : <Download aria-hidden="true" size={17} />}
              {t(isDownloading ? "receipt_pdf_generating" : "receipt_save_pdf")}
            </button>
          </div>
        </div>

        {downloadError && <p role="alert" className="receipt-download-error">{downloadError}</p>}

        <article ref={receiptRef} className="receipt-paper">
          <header className="receipt-head">
            <div className="receipt-brand">
              <img src={bebaLogo} alt={t("brand_logo_alt")} />
              <div>
                <p className="receipt-brand-name">BEBA CARGO</p>
                <p className="receipt-brand-tagline">{t("receipt_brand_tagline")}</p>
              </div>
            </div>
            <div className="receipt-title-block">
              <p className="receipt-kicker">{t("receipt_document_type")}</p>
              <h1 id="receipt-title">{t("receipt_title")}</h1>
              <p className="receipt-reference">#{reference}</p>
              <span className="receipt-paid-badge"><Check aria-hidden="true" size={14} />{t("receipt_status_paid")}</span>
            </div>
          </header>

          <div className="receipt-rule" />

          <section className="receipt-meta" aria-label={t("receipt_details")}>
            <div>
              <span className="receipt-label">{t("receipt_issue_date")}</span>
              <span className="receipt-value">{dateLabel}</span>
            </div>
            <div>
              <span className="receipt-label">{t("receipt_transaction_number")}</span>
              <span className="receipt-value">{payment?.transactionRef || `PAY-${payment?.id ?? "—"}`}</span>
            </div>
          </section>

          <section className="receipt-customer">
            <h2>{t("receipt_billed_to")}</h2>
            <p className="receipt-customer-name">{customer?.fullName || customer?.name || t("receipt_customer")}</p>
            {customer?.email && <p>{customer.email}</p>}
            {customer?.phone && <p>{customer.phone}</p>}
          </section>

          <section className="receipt-route" aria-label={t("receipt_route")}>
            <div className="receipt-route-point">
              <span className="receipt-route-marker receipt-route-pickup"><MapPin aria-hidden="true" size={16} /></span>
              <div>
                <span className="receipt-label">{t("receipt_pickup")}</span>
                <p>{shipment?.origin || "—"}</p>
              </div>
            </div>
            <div className="receipt-route-connector" />
            <div className="receipt-route-point">
              <span className="receipt-route-marker receipt-route-dropoff"><MapPin aria-hidden="true" size={16} /></span>
              <div>
                <span className="receipt-label">{t("receipt_dropoff")}</span>
                <p>{shipment?.destination || "—"}</p>
              </div>
            </div>
          </section>

          <section className="receipt-shipment-summary">
            <div className="receipt-section-heading">
              <Package aria-hidden="true" size={17} />
              <h2>{t("receipt_shipment_summary")}</h2>
            </div>
            <div className="receipt-summary-grid">
              <div><span className="receipt-label">{t("receipt_shipment_number")}</span><span className="receipt-value">#{shipment?.id ?? "—"}</span></div>
              <div><span className="receipt-label">{t("receipt_cargo")}</span><span className="receipt-value">{shipment?.cargoType || "—"}</span></div>
              <div><span className="receipt-label">{t("receipt_weight")}</span><span className="receipt-value">{shipment?.weightKg == null ? "—" : `${Number(shipment.weightKg).toLocaleString(locale)} kg`}</span></div>
              <div><span className="receipt-label">{t("receipt_distance")}</span><span className="receipt-value">{shipment?.distanceKm == null ? "—" : `${Number(shipment.distanceKm).toLocaleString(locale)} km`}</span></div>
            </div>
          </section>

          <section className="receipt-payment">
            <h2>{t("receipt_payment_breakdown")}</h2>
            <div className="receipt-line-item"><span>{t("receipt_base_fare")}</span><span>{currency(baseFare)}</span></div>
            <div className="receipt-line-item"><span>{t("receipt_distance_fee")}</span><span>{currency(distanceFee)}</span></div>
            <div className="receipt-line-item receipt-line-method"><span>{t("receipt_payment_method")}</span><span>{t(methodKey, { defaultValue: payment?.method || "—" })}</span></div>
            <div className="receipt-total"><span>{t("receipt_total_paid")}</span><strong>{currency(safeTotal)}</strong></div>
          </section>

          <footer className="receipt-footer">
            <p className="receipt-thank-you">{t("receipt_thank_you")}</p>
            <p>{t("receipt_support_prompt")}</p>
            {(supportEmail || supportPhone) && (
              <div className="receipt-support-links">
                {supportEmail && <a href={`mailto:${supportEmail}`}><Mail aria-hidden="true" size={14} />{supportEmail}</a>}
                {supportPhone && <a href={`tel:${supportPhone}`}><Phone aria-hidden="true" size={14} />{supportPhone}</a>}
              </div>
            )}
          </footer>
        </article>
      </section>
    </div>
  );
}

export default ReceiptModal;