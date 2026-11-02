import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";

const approvalStatuses = ["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED"];
const adminSections = ["overview", "drivers", "shipments", "complaints", "commissions", "notifications", "audit", "health"];
const shipmentStatuses = ["", "PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"];
const complaintStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
const vehiclePhotoFields = [
  { field: "frontPhoto", contentTypeField: "frontPhotoContentType", label: "vehicle_front_photo" },
  { field: "rearPhoto", contentTypeField: "rearPhotoContentType", label: "vehicle_back_photo" },
  { field: "leftPhoto", contentTypeField: "leftPhotoContentType", label: "vehicle_left_photo" },
  { field: "rightPhoto", contentTypeField: "rightPhotoContentType", label: "vehicle_right_photo" },
];

function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const initialParams = new URLSearchParams(window.location.search);
  const requestedSection = initialParams.get("section");
  const requestedStatus = initialParams.get("status");
  const requestedShipmentId = Number(initialParams.get("shipmentId"));
  const requestedComplaintId = Number(initialParams.get("complaintId"));
  const [statusFilter, setStatusFilter] = useState(
    requestedSection === "drivers" && approvalStatuses.includes(requestedStatus)
      ? requestedStatus : "PENDING_APPROVAL",
  );
  const [activeSection, setActiveSection] = useState(
    adminSections.includes(requestedSection) ? requestedSection : "overview",
  );
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [review, setReview] = useState(null);
  const [zoomedDocument, setZoomedDocument] = useState(null);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [loadingReview, setLoadingReview] = useState(false);
  const [acting, setActing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [commissionPayments, setCommissionPayments] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shipments, setShipments] = useState([]);
  const [shipmentQuery, setShipmentQuery] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState(
    Number.isSafeInteger(requestedShipmentId) && requestedShipmentId > 0
      ? requestedShipmentId : null,
  );
  const [shipmentHistory, setShipmentHistory] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [complaintStatusFilter, setComplaintStatusFilter] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(
    Number.isSafeInteger(requestedComplaintId) && requestedComplaintId > 0
      ? { id: requestedComplaintId } : null,
  );
  const [complaintEvidence, setComplaintEvidence] = useState(null);
  const [complaintActions, setComplaintActions] = useState([]);
  const [complaintResolution, setComplaintResolution] = useState("");
  const [auditEntries, setAuditEntries] = useState([]);
  const [loadingSection, setLoadingSection] = useState(false);

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user?.role]);

  useEffect(() => {
    let isActive = true;
    api.get("/admin/drivers", { params: { status: statusFilter === "ALL" ? undefined : statusFilter } })
      .then((response) => {
        if (isActive) setDrivers(Array.isArray(response.data) ? response.data : []);
      })
      .catch((requestError) => {
        if (isActive) {
          setError(typeof requestError.response?.data === "string"
            ? requestError.response.data
            : t("backend_error"));
        }
      })
      .finally(() => {
        if (isActive) setLoadingDrivers(false);
      });
    return () => {
      isActive = false;
    };
  }, [refreshKey, statusFilter, t]);

  useEffect(() => {
    let isActive = true;
    const loadOverview = () => {
      api.get("/admin/overview")
        .then((response) => {
          if (isActive) {
            setOverview(response.data);
            setUnreadCount(response.data.unreadNotifications || 0);
          }
        })
        .catch((requestError) => {
          if (isActive) setError(typeof requestError.response?.data === "string"
            ? requestError.response.data : t("backend_error"));
        });
    };
    loadOverview();
    const intervalId = window.setInterval(loadOverview, 5000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [refreshKey, t]);

  useEffect(() => {
    if (activeSection !== "health") return undefined;
    let isActive = true;
    api.get("/admin/health")
      .then((response) => { if (isActive) setHealth(response.data); })
      .catch((requestError) => {
        if (isActive) setError(typeof requestError.response?.data === "string"
          ? requestError.response.data : t("backend_error"));
      })
      .finally(() => { if (isActive) setLoadingSection(false); });
    return () => { isActive = false; };
  }, [activeSection, t]);

  useEffect(() => {
    if (activeSection !== "notifications") return undefined;
    let isActive = true;
    const loadNotifications = () => {
      api.get("/admin/notifications")
        .then((response) => {
          if (isActive) {
            setNotifications(response.data.notifications || []);
            setUnreadCount(response.data.unreadCount || 0);
          }
        })
        .catch((requestError) => {
          if (isActive) setError(typeof requestError.response?.data === "string"
            ? requestError.response.data : t("backend_error"));
        })
        .finally(() => { if (isActive) setLoadingSection(false); });
    };
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 5000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [activeSection, refreshKey, t]);

  useEffect(() => {
    if (activeSection !== "shipments") return undefined;
    let isActive = true;
    const params = { query: shipmentQuery || undefined, status: shipmentStatus || undefined, delayedOnly };
    const loadShipments = () => {
      api.get("/admin/shipments", { params })
        .then((response) => { if (isActive) setShipments(response.data || []); })
        .catch((requestError) => {
          if (isActive) setError(typeof requestError.response?.data === "string"
            ? requestError.response.data : t("backend_error"));
        })
        .finally(() => { if (isActive) setLoadingSection(false); });
    };
    loadShipments();
    const intervalId = window.setInterval(loadShipments, 5000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [activeSection, delayedOnly, refreshKey, shipmentQuery, shipmentStatus, t]);

  useEffect(() => {
    if (activeSection !== "shipments" || !selectedShipmentId) return undefined;
    let isActive = true;
    api.get(`/admin/shipments/${selectedShipmentId}/history`)
      .then((response) => { if (isActive) setShipmentHistory(response.data || []); })
      .catch((requestError) => {
        if (isActive) setError(typeof requestError.response?.data === "string"
          ? requestError.response.data : t("backend_error"));
      });
    return () => { isActive = false; };
  }, [activeSection, selectedShipmentId, t]);

  const selectedComplaintId = selectedComplaint?.id;
  useEffect(() => {
    if (activeSection !== "complaints" || !selectedComplaintId) return undefined;
    let isActive = true;
    const loadComplaint = async () => {
      try {
        const [detailResponse, actionsResponse] = await Promise.all([
          api.get(`/admin/complaints/${selectedComplaintId}`),
          api.get(`/admin/complaints/${selectedComplaintId}/actions`),
        ]);
        let evidence = null;
        if (detailResponse.data.complaint.hasEvidence) {
          const evidenceResponse = await api.get(`/admin/complaints/${selectedComplaintId}/evidence`);
          evidence = evidenceResponse.data;
        }
        if (isActive) {
          setSelectedComplaint(detailResponse.data);
          setComplaintActions(actionsResponse.data || []);
          setComplaintEvidence(evidence);
        }
      } catch (requestError) {
        if (isActive) setError(typeof requestError.response?.data === "string"
          ? requestError.response.data : t("backend_error"));
      }
    };
    loadComplaint();
    return () => { isActive = false; };
  }, [activeSection, selectedComplaintId, refreshKey, t]);

  useEffect(() => {
    if (activeSection !== "complaints") return undefined;
    let isActive = true;
    api.get("/admin/complaints", {
      params: { status: complaintStatusFilter || undefined },
    })
      .then((response) => { if (isActive) setComplaints(response.data || []); })
      .catch((requestError) => {
        if (isActive) setError(typeof requestError.response?.data === "string"
          ? requestError.response.data : t("backend_error"));
      })
      .finally(() => { if (isActive) setLoadingSection(false); });
    return () => { isActive = false; };
  }, [activeSection, complaintStatusFilter, refreshKey, t]);

  useEffect(() => {
    if (activeSection !== "audit") return undefined;
    let isActive = true;
    api.get("/admin/audit-logs")
      .then((response) => { if (isActive) setAuditEntries(response.data || []); })
      .catch((requestError) => {
        if (isActive) setError(typeof requestError.response?.data === "string"
          ? requestError.response.data : t("backend_error"));
      })
      .finally(() => { if (isActive) setLoadingSection(false); });
    return () => { isActive = false; };
  }, [activeSection, refreshKey, t]);

  useEffect(() => {
    if (activeSection !== "commissions") return undefined;
    let isActive = true;
    api.get("/admin/driver-commission-payments")
      .then((response) => { if (isActive) setCommissionPayments(Array.isArray(response.data) ? response.data : []); })
      .catch((requestError) => {
        if (isActive) setError(typeof requestError.response?.data === "string"
          ? requestError.response.data : t("backend_error"));
      })
      .finally(() => { if (isActive) setLoadingSection(false); });
    return () => { isActive = false; };
  }, [activeSection, refreshKey, t]);

  useEffect(() => {
    if (!selectedDriverId) return undefined;
    let isActive = true;
    const loadReview = async () => {
      try {
        const response = await api.get(`/admin/drivers/${selectedDriverId}`);
        const driver = response.data;
        const documentPromise = driver.hasLicenseDocument
          ? api.get(`/admin/drivers/${selectedDriverId}/license-document`)
          : Promise.resolve(null);
        const nidaDocumentPromise = driver.hasNidaDocument
          ? api.get(`/admin/drivers/${selectedDriverId}/nida-document`)
          : Promise.resolve(null);
        const vehiclePhotoPromises = (driver.vehicles || []).map((vehicle) => (
          vehicle.hasFourPhotos
            ? api.get(`/vehicles/${vehicle.id}/photos`)
            : Promise.resolve(null)
        ));
        const [documentResult, nidaDocumentResult, ...photoResults] = await Promise.allSettled([
          documentPromise,
          nidaDocumentPromise,
          ...vehiclePhotoPromises,
        ]);
        const document = documentResult.status === "fulfilled"
          ? documentResult.value?.data || null
          : null;
        const nidaDocument = nidaDocumentResult.status === "fulfilled"
          ? nidaDocumentResult.value?.data || null
          : null;
        const vehiclePhotos = {};
        photoResults.forEach((result, index) => {
          vehiclePhotos[driver.vehicles[index].id] = result.status === "fulfilled"
            ? result.value?.data || null
            : null;
        });
        if (isActive) {
            setReview({ driver, document, nidaDocument, vehiclePhotos });
          if (documentResult.status === "rejected"
              || nidaDocumentResult.status === "rejected"
              || photoResults.some((result) => result.status === "rejected")) {
            setError(t("admin_review_files_error"));
          }
        }
      } catch (requestError) {
        if (isActive) {
          setError(typeof requestError.response?.data === "string"
            ? requestError.response.data
            : t("backend_error"));
        }
      } finally {
        if (isActive) setLoadingReview(false);
      }
    };
    loadReview();
    return () => {
      isActive = false;
    };
  }, [selectedDriverId, t]);

  if (user?.role !== "ADMIN") return null;

  const updateApproval = async (action) => {
    if (!review) return;
    if (action === "reject" && !window.confirm(t("admin_confirm_reject"))) return;
    setActing(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.put(`/admin/drivers/${review.driver.id}/${action}`);
      setSuccess(t(action === "approve" ? "admin_driver_approved" : "admin_driver_rejected"));
      setReview((current) => ({
        ...current,
        driver: { ...current.driver, approvalStatus: response.data.approvalStatus },
      }));
      setLoadingDrivers(true);
      setRefreshKey((current) => current + 1);
      if (statusFilter !== response.data.approvalStatus) {
        setSelectedDriverId(null);
        setReview(null);
        setLoadingReview(false);
      }
    } catch (requestError) {
      setError(typeof requestError.response?.data === "string"
        ? requestError.response.data
        : t("backend_error"));
    } finally {
      setActing(false);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await api.patch(`/admin/notifications/${notificationId}/read`);
      const wasUnread = notifications.some((item) => item.id === notificationId && !item.read);
      setNotifications((items) => items.map((item) => (
        item.id === notificationId ? { ...item, read: true } : item
      )));
      if (wasUnread) {
        setUnreadCount((count) => Math.max(0, count - 1));
        setOverview((current) => current
          ? { ...current, unreadNotifications: Math.max(0, current.unreadNotifications - 1) }
          : current);
      }
    } catch (requestError) {
      setError(typeof requestError.response?.data === "string"
        ? requestError.response.data : t("backend_error"));
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.patch("/admin/notifications/read-all");
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
      setOverview((current) => current ? { ...current, unreadNotifications: 0 } : current);
    } catch (requestError) {
      setError(typeof requestError.response?.data === "string"
        ? requestError.response.data : t("backend_error"));
    }
  };

  const reviewCommissionPayment = async (paymentId, action) => {
    setActing(true);
    setError("");
    setSuccess("");
    try {
      await api.put(`/admin/driver-commission-payments/${paymentId}/${action}`);
      setSuccess(t(action === "verify" ? "admin_commission_verified" : "admin_commission_rejected"));
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(typeof requestError.response?.data === "string"
        ? requestError.response.data : t("backend_error"));
    } finally {
      setActing(false);
    }
  };

  const updateComplaint = async () => {
    if (!selectedComplaint?.complaint) return;
    if (["RESOLVED", "REJECTED"].includes(selectedComplaint.complaint.status)
        && !complaintResolution.trim()) {
      setError("A resolution note is required to close a complaint.");
      return;
    }
    if (complaintResolution.trim().length > 1000) {
      setError("Resolution note must be 1000 characters or fewer.");
      return;
    }
    try {
      await api.put(`/admin/complaints/${selectedComplaint.complaint.id}`, {
        status: selectedComplaint.complaint.status,
        resolutionNote: complaintResolution.trim() || null,
      });
      setComplaintResolution("");
      setRefreshKey((key) => key + 1);
      setSuccess("Complaint updated.");
    } catch (requestError) {
      setError(typeof requestError.response?.data === "string"
        ? requestError.response.data : t("backend_error"));
    }
  };

  const hasCompleteReviewRequirements = Boolean(
    review?.driver.hasFacePhoto
      && review.driver.hasNidaDocument
      && review.driver.hasLicenseDocument
      && review.driver.licenseExpiry
      && review.driver.licenseExpiry >= new Date().toISOString().slice(0, 10)
      && review.driver.vehicles.length > 0
      && review.driver.vehicles.every((vehicle) => vehicle.hasFourPhotos),
  );

  return (
    <main className="relative min-h-screen text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">
            {t("admin_dashboard_eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl font-bold">{t("admin_dashboard_title")}</h1>
          <p className="mt-2 text-sm text-zinc-400">{t("admin_dashboard_subtitle")}</p>
        </header>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <nav className="mb-6 grid grid-cols-2 gap-2 pb-2 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap" aria-label="Admin sections">
          {adminSections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => {
                setActiveSection(section);
                setLoadingSection(["health", "notifications", "shipments", "complaints", "commissions", "audit"].includes(section));
                setError("");
                setSuccess("");
              }}
              aria-current={activeSection === section ? "page" : undefined}
              className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-semibold capitalize transition ${
                activeSection === section
                  ? "border-amber-400 bg-amber-400 text-zinc-950"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400/60 hover:text-amber-200"
              }`}
            >
              {section === "notifications" ? `Notifications (${unreadCount})` : section === "commissions" ? t("admin_commission_payments") : section === "drivers" ? t("admin_driver_verification_queue") : section}
            </button>
          ))}
        </nav>

        {activeSection === "overview" && (
          <section aria-label="Admin overview">
            {!overview ? (
              <p className="mb-5 rounded-xl border border-white/10 bg-zinc-950/70 p-5 text-sm text-zinc-400">
                {error ? "Overview is unavailable." : "Loading overview…"}
              </p>
            ) : (
              <div className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                {[
                  ["Registered drivers", overview.totalDrivers, "drivers", "ALL"],
                  ["Pending approvals", overview.pendingApprovals, "drivers", "PENDING_APPROVAL"],
                  ["Active shipments", overview.activeShipments, "shipments", null],
                  ["Completed today", overview.completedToday, "shipments", "DELIVERED"],
                  ["Delayed shipments", overview.delayedShipments, "shipments", "delayed"],
                  ["Unresolved complaints", overview.unresolvedComplaints, "complaints", "OPEN"],
                  ["Unread notifications", overview.unreadNotifications, "notifications", null],
                ].map(([label, value, section, filter]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setActiveSection(section);
                      setLoadingSection(section === "shipments" || section === "complaints");
                      if (section === "drivers" && filter) setStatusFilter(filter);
                      if (section === "shipments") {
                        setShipmentStatus(filter && filter !== "delayed" ? filter : "");
                        setDelayedOnly(filter === "delayed");
                      }
                      if (section === "complaints") setComplaintStatusFilter("");
                    }}
                    className="rounded-xl border border-white/10 bg-zinc-950/80 p-4 text-left transition hover:border-amber-400/60 hover:bg-zinc-900"
                  >
                    <span className="block text-sm text-zinc-400">{label}</span>
                    <span className="mt-2 block text-2xl font-bold text-amber-300">{value}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {activeSection === "shipments" && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-950/80 p-4 sm:flex-row">
              <input
                value={shipmentQuery}
                onChange={(event) => { setLoadingSection(true); setShipmentQuery(event.target.value); }}
                placeholder="Search shipment, customer, driver or route"
                aria-label="Search shipments"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              />
              <select value={shipmentStatus} onChange={(event) => { setLoadingSection(true); setShipmentStatus(event.target.value); }}
                aria-label="Filter shipment status"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white">
                {shipmentStatuses.map((status) => <option key={status || "all"} value={status}>{status || "All statuses"}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={delayedOnly} onChange={(event) => { setLoadingSection(true); setDelayedOnly(event.target.checked); }} />
                Delayed only
              </label>
            </div>
            {loadingSection ? <p className="p-5 text-sm text-zinc-400">Loading shipments…</p>
              : shipments.length === 0 ? <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">No shipments match these filters.</p>
                : (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,1fr)]">
                    <ul className="space-y-2 xl:hidden">
                      {shipments.map((shipment) => (
                        <li key={shipment.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedShipmentId(shipment.id)}
                            className="w-full rounded-xl border border-white/10 bg-zinc-950/80 p-4 text-left transition hover:border-amber-400/40"
                          >
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-amber-200">#{shipment.id}{shipment.delayed ? " · Delayed" : ""}</span>
                              <span className="text-xs text-zinc-400">{shipment.status}</span>
                            </span>
                            <span className="mt-3 grid gap-2 text-sm">
                              <span><span className="text-zinc-500">Customer: </span>{shipment.customerName}</span>
                              <span><span className="text-zinc-500">Driver: </span>{shipment.driverName || "Unassigned"}</span>
                              <span><span className="text-zinc-500">Vehicle: </span>{shipment.vehiclePlateNumber || "Not linked"}</span>
                              <span className="break-words"><span className="text-zinc-500">Route: </span>{shipment.origin} → {shipment.destination}</span>
                              <span className="break-words text-xs text-zinc-500">{shipment.createdAt} · {shipment.updatedAt}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="hidden overflow-x-auto rounded-xl border border-white/10 xl:block">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-zinc-900 text-zinc-400"><tr>{["ID", "Customer", "Driver", "Vehicle", "Route", "Status", "Created", "Updated"].map((cell) => <th key={cell} className="px-3 py-3 font-medium">{cell}</th>)}</tr></thead>
                        <tbody className="divide-y divide-zinc-800">
                          {shipments.map((shipment) => (
                            <tr key={shipment.id} className={`cursor-pointer hover:bg-zinc-900 ${shipment.delayed ? "bg-red-950/20" : ""}`}
                              onClick={() => setSelectedShipmentId(shipment.id)}>
                              <td className="px-3 py-3 text-amber-200">#{shipment.id}{shipment.delayed ? " · Delayed" : ""}</td>
                              <td className="px-3 py-3">{shipment.customerName}</td>
                              <td className="px-3 py-3">{shipment.driverName || "Unassigned"}</td>
                              <td className="px-3 py-3">{shipment.vehiclePlateNumber || "Not linked"}</td>
                              <td className="px-3 py-3">{shipment.origin} → {shipment.destination}</td>
                              <td className="px-3 py-3">{shipment.status}</td>
                              <td className="px-3 py-3">{shipment.createdAt}</td>
                              <td className="px-3 py-3">{shipment.updatedAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <aside className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
                      <h2 className="mb-3 font-semibold">Shipment status history</h2>
                      {!selectedShipmentId ? <p className="text-sm text-zinc-500">Select a shipment to inspect its recorded history.</p>
                        : shipmentHistory.length === 0 ? <p className="text-sm text-zinc-500">No recorded tracking history.</p>
                          : <ol className="space-y-3">{shipmentHistory.map((entry, index) => (
                            <li key={`${entry.timestamp}-${index}`} className="border-l border-amber-400/50 pl-3 text-sm">
                              <p className="font-medium text-amber-200">{entry.status}</p>
                              <p className="text-zinc-400">{entry.timestamp} · {entry.location || "No location recorded"}</p>
                            </li>
                          ))}</ol>}
                    </aside>
                  </div>
                )}
          </section>
        )}

        {activeSection === "complaints" && (
          <section className="grid gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
            <div className="space-y-3">
              <select value={complaintStatusFilter} onChange={(event) => { setLoadingSection(true); setComplaintStatusFilter(event.target.value); }}
                aria-label="Filter complaint status"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white">
                <option value="">All complaint statuses</option>
                {complaintStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              {loadingSection ? <p className="p-4 text-sm text-zinc-400">Loading complaints…</p>
                : complaints.length === 0 ? <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-400">No complaints found.</p>
                  : complaints.map((complaint) => (
                    <button type="button" key={complaint.id} onClick={() => {
                      setSelectedComplaint({ id: complaint.id });
                      setComplaintResolution(complaint.resolutionNote || "");
                      setComplaintEvidence(null);
                      setComplaintActions([]);
                    }} className="w-full rounded-xl border border-white/10 bg-zinc-950/80 p-4 text-left hover:border-amber-400/50">
                      <span className="flex justify-between gap-2 font-semibold"><span>Complaint #{complaint.id}</span><span className="text-amber-200">{complaint.status}</span></span>
                      <span className="mt-2 block text-xs text-zinc-400">Shipment #{complaint.shipmentId} · {complaint.reporterName}</span>
                      <span className="mt-2 block line-clamp-2 text-sm text-zinc-300">{complaint.description}</span>
                    </button>
                  ))}
            </div>
            <article className="min-w-0 rounded-xl border border-white/10 bg-zinc-950/80 p-5">
              {!selectedComplaint?.complaint ? <p className="text-sm text-zinc-500">Select a complaint to review it.</p> : (
                <>
                  <h2 className="text-lg font-semibold">Complaint #{selectedComplaint.complaint.id}</h2>
                  <p className="mt-2 text-sm text-zinc-300">{selectedComplaint.complaint.description}</p>
                  <p className="mt-2 text-xs text-zinc-500">Shipment #{selectedComplaint.complaint.shipmentId} · {selectedComplaint.complaint.reporterName} · Assigned reviewer: {selectedComplaint.complaint.assignedReviewerName || "Unassigned"}</p>
                  {complaintEvidence && (
                    <div className="my-4">
                      {complaintEvidence.contentType === "application/pdf"
                        ? <iframe title="Complaint evidence" src={`data:application/pdf;base64,${complaintEvidence.base64Data}`} className="h-80 w-full rounded-lg bg-white" />
                        : <img alt="Complaint evidence" src={`data:${complaintEvidence.contentType};base64,${complaintEvidence.base64Data}`} className="max-h-80 rounded-lg object-contain" />}
                    </div>
                  )}
                  <h3 className="mt-4 font-medium">Shipment history</h3>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-xs text-zinc-400">
                    {selectedComplaint.shipmentHistory.map((entry, index) => <li key={`${entry.timestamp}-${index}`}>{entry.timestamp} · {entry.status} · {entry.location || "No location recorded"}</li>)}
                  </ul>
                  <label className="mt-4 block text-sm text-zinc-300">Resolution status
                    <select value={selectedComplaint.complaint.status}
                      onChange={(event) => setSelectedComplaint((current) => ({
                        ...current, complaint: { ...current.complaint, status: event.target.value },
                      }))}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white">
                      {complaintStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className="mt-3 block text-sm text-zinc-300">Resolution note
                    <textarea value={complaintResolution} maxLength={1000} onChange={(event) => setComplaintResolution(event.target.value)}
                      className="mt-1 min-h-20 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                  </label>
                  <button type="button" onClick={updateComplaint} className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950">Save complaint update</button>
                  <h3 className="mt-5 font-medium">Recorded actions</h3>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-400">{complaintActions.map((entry) => <li key={entry.id}>{entry.timestamp} · {entry.action} · {entry.metadata}</li>)}</ul>
                </>
              )}
            </article>
          </section>
        )}

        {activeSection === "commissions" && (
          <section className="space-y-3">
            <header className="mb-4">
              <h2 className="text-lg font-semibold">{t("admin_commission_payments")}</h2>
              <p className="mt-1 text-sm text-zinc-400">{t("admin_commission_payments_hint")}</p>
            </header>
            {loadingSection ? <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">{t("admin_commission_loading")}</p>
              : commissionPayments.length === 0 ? <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">{t("admin_commission_empty")}</p>
                : commissionPayments.map((payment) => (
                  <article key={payment.id} className="flex flex-col justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950/75 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{payment.driverName} <span className="text-zinc-500">#{payment.driverId}</span></p>
                      <p className="mt-1 text-sm text-amber-100">TSh {Number(payment.amount).toLocaleString()} · {payment.reference}</p>
                      <p className="mt-1 text-xs text-zinc-500">{payment.submittedAt ? new Date(payment.submittedAt).toLocaleString() : ""}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={acting} onClick={() => reviewCommissionPayment(payment.id, "reject")} className="min-h-10 rounded-lg border border-rose-200/25 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-200/10 disabled:opacity-50">{t("admin_commission_reject")}</button>
                      <button type="button" disabled={acting} onClick={() => reviewCommissionPayment(payment.id, "verify")} className="min-h-10 rounded-lg bg-emerald-200 px-3 py-2 text-sm font-bold text-zinc-950 hover:bg-emerald-100 disabled:opacity-50">{t("admin_commission_verify")}</button>
                    </div>
                  </article>
                ))}
          </section>
        )}

        {activeSection === "notifications" && (
          <section className="space-y-3">
            <div className="flex justify-end"><button type="button" disabled={!unreadCount} onClick={markAllNotificationsRead} className="rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-200 disabled:opacity-40">Mark all as read</button></div>
            {loadingSection ? <p className="p-5 text-sm text-zinc-400">Loading notifications…</p>
              : notifications.length === 0 ? <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">No notifications.</p>
                : notifications.map((notification) => (
                  <article key={notification.id} className={`rounded-xl border p-4 ${notification.read ? "border-white/10 bg-zinc-950/70" : "border-amber-400/40 bg-amber-400/5"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-medium">{notification.message}</p><p className="mt-1 text-xs text-zinc-400">{notification.type} · {notification.priority} · {notification.timestamp}</p></div>
                      <div className="flex gap-3">
                        {notification.relatedLink && <a href={notification.relatedLink} className="text-sm text-amber-200 underline">Open related record</a>}
                        {!notification.read && <button type="button" onClick={() => markNotificationRead(notification.id)} className="text-sm text-amber-200 underline">Mark read</button>}
                      </div>
                    </div>
                  </article>
                ))}
          </section>
        )}

        {activeSection === "audit" && (
          <section className="overflow-hidden rounded-xl border border-white/10">
            {loadingSection ? <p className="p-5 text-sm text-zinc-400">Loading audit entries…</p>
              : auditEntries.length === 0 ? <p className="p-5 text-sm text-zinc-400">No audit events recorded.</p>
                : <>
                  <ul className="divide-y divide-zinc-800 xl:hidden">
                    {auditEntries.map((entry) => (
                      <li key={entry.id} className="space-y-2 bg-zinc-950/80 p-4 text-sm">
                        <p className="break-words font-semibold text-amber-200">{entry.action}</p>
                        <dl className="grid gap-2 text-xs min-[420px]:grid-cols-2">
                          <div><dt className="text-zinc-500">Time</dt><dd className="break-words text-zinc-200">{entry.timestamp}</dd></div>
                          <div><dt className="text-zinc-500">Actor ID</dt><dd className="text-zinc-200">{entry.actorId}</dd></div>
                          <div><dt className="text-zinc-500">Record</dt><dd className="break-words text-zinc-200">{entry.recordType} #{entry.recordId}</dd></div>
                          <div className="min-w-0"><dt className="text-zinc-500">Metadata</dt><dd className="break-words text-zinc-200">{entry.metadata}</dd></div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto xl:block">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead className="bg-zinc-900 text-zinc-400"><tr>{["Time", "Actor ID", "Action", "Record", "Metadata"].map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead>
                      <tbody className="divide-y divide-zinc-800">{auditEntries.map((entry) => (
                        <tr key={entry.id}><td className="px-3 py-3">{entry.timestamp}</td><td className="px-3 py-3">{entry.actorId}</td><td className="px-3 py-3">{entry.action}</td><td className="px-3 py-3">{entry.recordType} #{entry.recordId}</td><td className="px-3 py-3">{entry.metadata}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>}
          </section>
        )}

        {activeSection === "health" && (
          <section className="rounded-xl border border-white/10 bg-zinc-950/80 p-5">
            {!health ? <p className="text-sm text-zinc-400">{loadingSection ? "Loading system health…" : "Health information is unavailable."}</p>
              : <dl className="grid gap-4 sm:grid-cols-2">
                {[["API", health.api], ["Database", health.database], ["Backups", health.backups], ["Last backup success", health.lastBackupSuccess || "Not verified"]].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 p-4"><dt className="text-sm text-zinc-400">{label}</dt><dd className={`mt-1 font-semibold ${value === "UP" ? "text-emerald-300" : "text-amber-200"}`}>{value}</dd></div>
                ))}
                <p className="text-xs text-amber-200 sm:col-span-2">Backup state is informational only; no backup artifact or restore has been verified by this application.</p>
              </dl>}
          </section>
        )}

        {activeSection === "drivers" && (
          <>
        <h2 className="mb-4 text-lg font-semibold">{t("admin_driver_verification_queue")}</h2>
        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={t("admin_approval_status")}>
          {approvalStatuses.map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={statusFilter === status}
              onClick={() => {
                setStatusFilter(status);
                setSelectedDriverId(null);
                setReview(null);
                setLoadingReview(false);
                setLoadingDrivers(true);
                setError("");
                setSuccess("");
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                statusFilter === status
                  ? "border-amber-400 bg-amber-400 text-zinc-950"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400/60 hover:text-amber-200"
              }`}
            >
              {status === "ALL" ? "All drivers" : t(`approval_${status}`)}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
              <h2 className="font-semibold">{t("admin_registered_drivers")}</h2>
              <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                {drivers.length}
              </span>
            </div>
            {loadingDrivers ? (
              <p className="p-5 text-sm text-zinc-400">{t("admin_loading_drivers")}</p>
            ) : drivers.length === 0 ? (
              <p className="p-5 text-sm text-zinc-500">{t("admin_no_drivers")}</p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {drivers.map((driver) => (
                  <li key={driver.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDriverId(driver.id);
                        setReview(null);
                        setLoadingReview(true);
                        setError("");
                      }}
                      aria-current={selectedDriverId === driver.id ? "true" : undefined}
                      className={`w-full px-4 py-4 text-left transition hover:bg-zinc-900 ${
                        selectedDriverId === driver.id ? "border-l-2 border-amber-400 bg-zinc-900" : ""
                      }`}
                    >
                      <span className="block font-medium text-white">{driver.fullName}</span>
                      <span className="mt-1 block break-all text-xs text-zinc-400">{driver.email}</span>
                      <span className="mt-2 inline-flex rounded-full border border-amber-500/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
                        {t(`approval_${driver.approvalStatus}`)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950/80 p-5 sm:p-6">
            {!selectedDriverId ? (
              <div className="flex min-h-48 items-center justify-center text-center text-sm text-zinc-500">
                {t("admin_select_driver")}
              </div>
            ) : loadingReview ? (
              <p className="py-10 text-center text-sm text-zinc-400">{t("admin_loading_review")}</p>
            ) : review ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
                  <div>
                    <h2 className="text-xl font-bold">{review.driver.fullName}</h2>
                    <p className="mt-1 break-all text-sm text-zinc-400">{review.driver.email}</p>
                    <p className="mt-1 text-sm text-zinc-400">{review.driver.phone}</p>
                    <span className="mt-3 inline-flex rounded-full border border-amber-500/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
                      {t(`approval_${review.driver.approvalStatus}`)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={acting || review.driver.approvalStatus === "APPROVED"}
                      onClick={() => updateApproval("approve")}
                      className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {acting ? t("admin_saving") : t("admin_approve")}
                    </button>
                    <button
                      type="button"
                      disabled={acting || review.driver.approvalStatus === "REJECTED"}
                      onClick={() => updateApproval("reject")}
                      className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t("admin_reject")}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 py-5 text-sm sm:grid-cols-2">
                  <div><span className="text-zinc-500">{t("nida_number")}: </span>{review.driver.nidaNumber || t("admin_not_provided")}</div>
                  <div><span className="text-zinc-500">{t("license_number")}: </span>{review.driver.licenseNumber || t("admin_not_provided")}</div>
                  <div><span className="text-zinc-500">{t("license_expiry")}: </span>{review.driver.licenseExpiry || t("admin_not_provided")}</div>
                  <div><span className="text-zinc-500">{t("face_photo")}: </span>{review.driver.hasFacePhoto ? t("admin_provided") : t("admin_missing")}</div>
                  <div><span className="text-zinc-500">{t("driver_nida_document")}: </span>{review.driver.hasNidaDocument ? t("admin_provided") : t("admin_missing")}</div>
                </div>

                <div className="border-t border-zinc-800 py-5">
                  <h3 className="mb-3 font-semibold">{t("driver_nida_document")}</h3>
                  {review.nidaDocument ? (
                    <button type="button" onClick={() => setZoomedDocument({ ...review.nidaDocument, title: t("driver_nida_document") })} className="block max-w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-left transition hover:border-amber-300/40 focus-visible:outline-2 focus-visible:outline-amber-300">
                      <img src={`data:${review.nidaDocument.contentType};base64,${review.nidaDocument.base64Data}`} alt={t("driver_nida_document")} className="max-h-64 max-w-full rounded object-contain" />
                      <span className="mt-2 block text-xs text-zinc-400">{t("admin_zoom_document")}</span>
                    </button>
                  ) : (
                    <p className="text-sm text-zinc-500">{t("admin_document_unavailable")}</p>
                  )}
                </div>

                <div className="border-t border-zinc-800 pt-5">
                  <h3 className="mb-3 font-semibold">{t("driver_license_document")}</h3>
                  {review.document ? (
                    review.document.contentType === "application/pdf" ? (
                      <iframe
                        title={t("driver_license_document")}
                        src={`data:application/pdf;base64,${review.document.base64Data}`}
                        className="h-[32rem] w-full rounded-lg border border-zinc-800 bg-white"
                      />
                    ) : (
                      <button type="button" onClick={() => setZoomedDocument({ ...review.document, title: t("driver_license_document") })} className="block max-w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-left transition hover:border-amber-300/40 focus-visible:outline-2 focus-visible:outline-amber-300">
                        <img
                          src={`data:${review.document.contentType};base64,${review.document.base64Data}`}
                          alt={t("driver_license_document")}
                          className="max-h-[32rem] max-w-full rounded-lg object-contain"
                        />
                        <span className="mt-2 block text-xs text-zinc-400">{t("admin_zoom_document")}</span>
                      </button>
                    )
                  ) : (
                    <p className="text-sm text-zinc-500">{t("admin_document_unavailable")}</p>
                  )}
                </div>

                {zoomedDocument && (
                  <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/90 p-2 backdrop-blur-sm sm:p-4" role="presentation" onClick={() => setZoomedDocument(null)}>
                    <div role="dialog" aria-modal="true" aria-label={zoomedDocument.title} className="relative flex max-h-[100dvh] max-w-full flex-col items-center" onClick={(event) => event.stopPropagation()}>
                      <button type="button" aria-label={t("close_menu")} onClick={() => setZoomedDocument(null)} className="mb-3 self-end rounded-lg border border-white/20 bg-zinc-950 px-3 py-2 text-sm font-semibold text-white">{t("driver_delivery_cancel")}</button>
                      <img src={`data:${zoomedDocument.contentType};base64,${zoomedDocument.base64Data}`} alt={zoomedDocument.title} className="max-h-[calc(100dvh-5rem)] max-w-[calc(100vw-1rem)] rounded-lg object-contain sm:max-w-[95vw]" />
                    </div>
                  </div>
                )}

                <div className="mt-6 border-t border-zinc-800 pt-5">
                  <h3 className="mb-4 font-semibold">{t("admin_vehicle_photos")}</h3>
                  {review.driver.vehicles.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("admin_no_vehicles")}</p>
                  ) : (
                    <div className="space-y-6">
                      {review.driver.vehicles.map((vehicle) => {
                        const photos = review.vehiclePhotos[vehicle.id];
                        return (
                          <article key={vehicle.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-medium">{vehicle.plateNumber}</h4>
                              <span className="text-sm text-zinc-400">
                                {vehicle.vehicleType} · {vehicle.capacityKg} kg
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                              {vehiclePhotoFields.map(({ field, contentTypeField, label }) => (
                                <figure key={field}>
                                  <figcaption className="mb-1 text-xs text-zinc-400">{t(label)}</figcaption>
                                  {photos?.[field] && photos?.[contentTypeField] ? (
                                    <img
                                      src={`data:${photos[contentTypeField]};base64,${photos[field]}`}
                                      alt={`${vehicle.plateNumber} - ${t(label)}`}
                                      className="aspect-[4/3] w-full rounded-md border border-zinc-800 bg-zinc-950 object-contain"
                                    />
                                  ) : (
                                    <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-zinc-700 bg-zinc-950 px-2 text-center text-xs text-zinc-500">
                                      {t("admin_photo_unavailable")}
                                    </div>
                                  )}
                                </figure>
                              ))}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
                {!hasCompleteReviewRequirements && review.driver.approvalStatus !== "APPROVED" && (
                  <p className="mt-5 rounded-lg border border-amber-500/20 bg-amber-400/5 px-3 py-2 text-sm text-amber-200">
                    {t("admin_approval_requirements")}
                  </p>
                )}
              </div>
            ) : null}
          </section>
        </div>
          </>
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;
