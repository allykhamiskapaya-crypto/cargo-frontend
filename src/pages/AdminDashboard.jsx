import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import api from "../api/axiosClient";
import { startVisibleInterval } from "../utils/startVisibleInterval";

const approvalStatuses = ["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED"];
const adminSections = ["overview", "drivers", "shipments", "users", "complaints", "commissions", "notifications", "audit", "health"];
const adminSectionIcons = {
  overview: LayoutDashboard,
  drivers: Truck,
  shipments: Package,
  users: Users,
  complaints: AlertTriangle,
  commissions: CircleDollarSign,
  notifications: Bell,
  audit: ShieldCheck,
  health: Activity,
};
const shipmentStatuses = ["", "PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"];
const complaintStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"];
const shipmentStatusLabel = (t, status) => status
  ? t(`driver_status_${String(status).toLowerCase()}`, { defaultValue: status })
  : t("admin_all_statuses");
const shipmentStatusBadgeClass = (status, delayed) => {
  if (delayed || status === "CANCELLED") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "DELIVERED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "IN_TRANSIT" || status === "PICKED_UP") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
};
const complaintStatusLabel = (t, status) =>
  t(`complaint_status_${String(status).toLowerCase()}`, { defaultValue: status });
const vehiclePhotoFields = [
  { field: "frontPhoto", contentTypeField: "frontPhotoContentType", label: "vehicle_front_photo" },
  { field: "rearPhoto", contentTypeField: "rearPhotoContentType", label: "vehicle_back_photo" },
  { field: "leftPhoto", contentTypeField: "leftPhotoContentType", label: "vehicle_left_photo" },
  { field: "rightPhoto", contentTypeField: "rightPhotoContentType", label: "vehicle_right_photo" },
];

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "sw" ? "sw-TZ" : "en-TZ";
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const initialParams = new URLSearchParams(window.location.search);
  const requestedSection = initialParams.get("section");
  const requestedStatus = initialParams.get("status");
  const requestedShipmentId = Number(initialParams.get("shipmentId"));
  const requestedComplaintId = Number(initialParams.get("complaintId"));
  const [driversQuery, setDriversQuery] = useState("");
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
  const [approvalConfirmation, setApprovalConfirmation] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [overview, setOverview] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [health, setHealth] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [usersQuery, setUsersQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [notifications, setNotifications] = useState([]);
  const [commissionPayments, setCommissionPayments] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shipments, setShipments] = useState([]);
  const [shipmentQuery, setShipmentQuery] = useState("");
  const [shipmentQueryInput, setShipmentQueryInput] = useState("");
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
  const [loadingSection, setLoadingSection] = useState(
    ["health", "notifications", "shipments", "users", "complaints", "commissions", "audit"].includes(requestedSection),
  );

  useEffect(() => {
    if (user?.role !== "ADMIN") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user?.role]);

  useEffect(() => {
    if (activeSection !== "drivers") return undefined;
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
  }, [activeSection, refreshKey, statusFilter, t]);

  useEffect(() => {
    if (activeSection !== "overview") return undefined;
    let isActive = true;
    const loadOverview = () => api.get("/admin/overview")
        .then((response) => {
          if (isActive) {
            setOverview(response.data);
            setUnreadCount(response.data.unreadNotifications || 0);
            setLastUpdated(new Date());
          }
        })
        .catch((requestError) => {
          if (isActive) setError(typeof requestError.response?.data === "string"
            ? requestError.response.data : t("backend_error"));
        });
    const stopPolling = startVisibleInterval(loadOverview, 15000);
    return () => {
      isActive = false;
      stopPolling();
    };
  }, [activeSection, refreshKey, t]);

  useEffect(() => {
    if (activeSection !== "users") return undefined;
    let isActive = true;
    api.get("/admin/users")
      .then((response) => {
        if (isActive) setAdminUsers(Array.isArray(response.data) ? response.data : []);
      })
      .catch((requestError) => {
        if (isActive) setError(typeof requestError.response?.data === "string"
          ? requestError.response.data : t("backend_error"));
      })
      .finally(() => { if (isActive) setLoadingSection(false); });
    return () => { isActive = false; };
  }, [activeSection, refreshKey, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShipmentQuery(shipmentQueryInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [shipmentQueryInput]);

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
  }, [activeSection, refreshKey, t]);

  useEffect(() => {
    if (activeSection !== "notifications") return undefined;
    let isActive = true;
    const loadNotifications = () => api.get("/admin/notifications")
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
    const stopPolling = startVisibleInterval(loadNotifications, 15000);
    return () => {
      isActive = false;
      stopPolling();
    };
  }, [activeSection, refreshKey, t]);

  useEffect(() => {
    if (activeSection !== "shipments") return undefined;
    let isActive = true;
    const params = { query: shipmentQuery || undefined, status: shipmentStatus || undefined, delayedOnly };
    const loadShipments = () => api.get("/admin/shipments", { params })
        .then((response) => { if (isActive) setShipments(response.data || []); })
        .catch((requestError) => {
          if (isActive) setError(typeof requestError.response?.data === "string"
            ? requestError.response.data : t("backend_error"));
        })
        .finally(() => { if (isActive) setLoadingSection(false); });
    const stopPolling = startVisibleInterval(loadShipments, 15000);
    return () => {
      isActive = false;
      stopPolling();
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
    setApprovalConfirmation(null);
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
      setError(t("admin_complaint_resolution_required"));
      return;
    }
    if (complaintResolution.trim().length > 1000) {
      setError(t("admin_complaint_resolution_max"));
      return;
    }
    try {
      await api.put(`/admin/complaints/${selectedComplaint.complaint.id}`, {
        status: selectedComplaint.complaint.status,
        resolutionNote: complaintResolution.trim() || null,
      });
      setComplaintResolution("");
      setRefreshKey((key) => key + 1);
      setSuccess(t("admin_complaint_updated"));
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
  const completionRate = overview?.totalShipments
    ? Math.round((overview.totalDelivered / overview.totalShipments) * 100)
    : 0;
  const revenueFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  });
  const revenuePoints = overview?.revenueLastSevenDays || [];
  const maxRevenue = Math.max(1, ...revenuePoints.map((point) => Number(point.amount) || 0));
  const operational = health
    ? health.api === "UP" && health.database === "UP"
    : Boolean(overview);
  const visibleDrivers = drivers.filter((driver) => (
    `${driver.fullName} ${driver.email} ${driver.phone}`
      .toLowerCase()
      .includes(driversQuery.trim().toLowerCase())
  ));
  const visibleUsers = adminUsers.filter((adminUser) => {
    const matchesRole = userRoleFilter === "ALL" || adminUser.role === userRoleFilter;
    const searchText = `${adminUser.fullName} ${adminUser.email} ${adminUser.phone} ${adminUser.companyName || ""}`
      .toLowerCase();
    return matchesRole && searchText.includes(usersQuery.trim().toLowerCase());
  });

  return (
    <main className="relative min-h-screen min-w-0 overflow-x-clip text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6 rounded-2xl border border-white/10 bg-zinc-950/80 p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">
                {t("admin_dashboard_eyebrow")}
              </p>
              <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">{t("admin_dashboard_title")}</h1>
              <p className="mt-2 max-w-2xl break-words text-sm leading-5 text-zinc-400">{t("admin_dashboard_subtitle")}</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <div className="mr-auto flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 md:mr-0">
                <span className={`h-2.5 w-2.5 rounded-full ${operational ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" : "bg-amber-400"}`} />
                <span className="text-xs font-semibold text-zinc-200">
                  {t(operational ? "admin_platform_operational" : "admin_platform_status_unknown")}
                </span>
                {lastUpdated && (
                  <span className="hidden border-l border-zinc-700 pl-2 text-xs text-zinc-500 sm:inline">
                    {lastUpdated.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setLoadingSection(true); setRefreshKey((current) => current + 1); }}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 transition hover:border-amber-400/60 hover:text-amber-200 sm:w-auto"
              >
                <RefreshCw size={16} aria-hidden="true" />
                {t("admin_refresh")}
              </button>
              <button
                type="button"
                onClick={() => { setActiveSection("notifications"); setLoadingSection(true); }}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 sm:w-auto"
              >
                <Bell size={16} aria-hidden="true" />
                <span>{t("admin_section_notifications", { count: unreadCount })}</span>
              </button>
            </div>
          </div>
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

        <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="min-w-0">
            <nav className="grid min-w-0 grid-cols-2 gap-2 pb-1 min-[520px]:grid-cols-3 lg:sticky lg:top-24 lg:flex lg:flex-col lg:overflow-visible" aria-label={t("admin_sections")}>
              {adminSections.map((section) => {
                const SectionIcon = adminSectionIcons[section];
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => {
                      setActiveSection(section);
                      setLoadingSection(["health", "notifications", "shipments", "users", "complaints", "commissions", "audit"].includes(section));
                      if (section === "drivers") setLoadingDrivers(true);
                      setError("");
                      setSuccess("");
                    }}
                    aria-current={activeSection === section ? "page" : undefined}
                    className={`inline-flex min-h-11 min-w-0 w-full items-center gap-2 rounded-xl border px-2 py-2 text-left text-xs font-semibold leading-4 transition sm:gap-3 sm:px-3 sm:text-sm lg:w-full ${
                      activeSection === section
                        ? "border-amber-400/70 bg-amber-400/10 text-amber-200 shadow-sm shadow-amber-950/30"
                        : "border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-amber-400/40 hover:text-zinc-100"
                    }`}
                  >
                    <SectionIcon size={17} className="shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">{t(`admin_section_${section}`, { count: unreadCount })}</span>
                    {section === "notifications" && unreadCount > 0 && (
                      <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-zinc-950">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
          <div className="min-w-0">

        {activeSection === "overview" && (
          <section aria-label={t("admin_section_overview")}>
            {!overview ? (
              <div className="grid gap-3 min-[400px]:grid-cols-2 xl:grid-cols-3" aria-label={t("admin_overview_loading")}>
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
                    <div className="h-3 w-24 rounded bg-zinc-800" />
                    <div className="mt-5 h-7 w-32 rounded bg-zinc-800" />
                    <div className="mt-3 h-3 w-20 rounded bg-zinc-900" />
                  </div>
                ))}
                {error && <p role="alert" className="text-sm text-red-300 min-[400px]:col-span-2 xl:col-span-3">{t("admin_overview_unavailable")}</p>}
              </div>
            ) : (
              <>
              <div className="mb-5 grid gap-3 min-[400px]:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    label: "admin_metric_paid_revenue",
                    value: revenueFormatter.format(Number(overview.paidRevenue) || 0),
                    detail: t("admin_revenue_seven_days"),
                    icon: CircleDollarSign,
                    section: "commissions",
                  },
                  {
                    label: "admin_metric_active_shipments",
                    value: overview.activeShipments,
                    detail: t("admin_total_shipments_count", { count: overview.totalShipments }),
                    icon: Package,
                    section: "shipments",
                  },
                  {
                    label: "admin_metric_online_drivers",
                    value: `${overview.onlineDrivers} / ${overview.approvedDrivers}`,
                    detail: t("admin_online_approved_hint"),
                    icon: Truck,
                    section: "drivers",
                    filter: "APPROVED",
                  },
                  {
                    label: "admin_metric_pending_approvals",
                    value: overview.pendingApprovals,
                    detail: t("admin_driver_verification_queue"),
                    icon: Clock3,
                    section: "drivers",
                    filter: "PENDING_APPROVAL",
                  },
                  {
                    label: "admin_metric_completion_rate",
                    value: `${completionRate}%`,
                    detail: t("admin_delivered_count", { count: overview.totalDelivered }),
                    icon: CheckCircle2,
                    section: "shipments",
                    filter: "DELIVERED",
                  },
                  {
                    label: "admin_metric_registered_users",
                    value: overview.registeredUsers,
                    detail: t("admin_customer_and_driver_accounts"),
                    icon: Users,
                    section: "users",
                  },
                  {
                    label: "admin_metric_delayed_shipments",
                    value: overview.delayedShipments,
                    detail: t("admin_delayed_only"),
                    icon: AlertTriangle,
                    section: "shipments",
                    filter: "delayed",
                  },
                  {
                    label: "admin_metric_unresolved_complaints",
                    value: overview.unresolvedComplaints,
                    detail: t("admin_section_complaints"),
                    icon: AlertTriangle,
                    section: "complaints",
                  },
                  {
                    label: "admin_metric_completed_today",
                    value: overview.completedToday,
                    detail: t("admin_metric_completed_today"),
                    icon: CheckCircle2,
                    section: "shipments",
                    filter: "DELIVERED",
                  },
                ].map(({ label, value, detail, icon: MetricIcon, section, filter }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setActiveSection(section);
                      setLoadingSection(["shipments", "complaints", "users"].includes(section));
                      if (section === "drivers" && filter) setStatusFilter(filter);
                      if (section === "shipments") {
                        setShipmentStatus(filter && filter !== "delayed" ? filter : "");
                        setDelayedOnly(filter === "delayed");
                        setShipmentQueryInput("");
                      }
                      if (section === "complaints") setComplaintStatusFilter("");
                    }}
                    className="group flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-zinc-950/80 p-3 text-left shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-zinc-900 sm:p-4"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t(label)}</span>
                      <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-2 text-amber-300"><MetricIcon size={17} aria-hidden="true" /></span>
                    </span>
                    <span className="mt-3 block text-2xl font-bold leading-tight tracking-tight text-white [overflow-wrap:anywhere] sm:text-3xl">{value}</span>
                    <span className="mt-auto block pt-2 text-xs leading-5 text-zinc-500">{detail}</span>
                  </button>
                ))}
              </div>
              <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:p-5" aria-label={t("admin_revenue_seven_days")}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{t("admin_revenue_seven_days")}</h2>
                    <p className="mt-1 text-xs text-zinc-500">{t("admin_paid_revenue_hint")}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-200">{revenueFormatter.format(Number(overview.paidRevenue) || 0)}</span>
                </div>
                <div className="flex h-24 items-end gap-2" role="img" aria-label={t("admin_revenue_seven_days")}>
                  {revenuePoints.map((point) => {
                    const amount = Number(point.amount) || 0;
                    const height = amount ? Math.max(10, (amount / maxRevenue) * 100) : 4;
                    return (
                      <div key={point.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${point.date}: ${revenueFormatter.format(amount)}`}>
                        <div className="w-full max-w-12 rounded-t bg-gradient-to-t from-amber-500/60 to-amber-300" style={{ height: `${height}%` }} />
                        <span className="text-[9px] text-zinc-600">{String(point.date).slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
              </>
            )}
          </section>
        )}

        {activeSection === "shipments" && (
          <section className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={shipmentQueryInput}
                    onChange={(event) => { setLoadingSection(true); setShipmentQueryInput(event.target.value); }}
                    placeholder={t("admin_search_shipments_placeholder")}
                    aria-label={t("admin_search_shipments")}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <select value={shipmentStatus} onChange={(event) => { setLoadingSection(true); setShipmentStatus(event.target.value); }}
                  aria-label={t("admin_filter_shipment_status")}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white sm:w-auto">
                  {shipmentStatuses.map((status) => <option key={status || "all"} value={status}>{shipmentStatusLabel(t, status)}</option>)}
                </select>
                <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-zinc-800 px-3 text-sm leading-5 text-zinc-300 sm:w-auto">
                  <input type="checkbox" checked={delayedOnly} onChange={(event) => { setLoadingSection(true); setDelayedOnly(event.target.checked); }} />
                  {t("admin_delayed_only")}
                </label>
              </div>
              <div className="flex flex-wrap gap-2 pb-1" role="group" aria-label={t("admin_filter_shipment_status")}>
                {["", "PENDING", "IN_TRANSIT", "DELIVERED"].map((status) => (
                  <button
                    key={status || "all"}
                    type="button"
                    aria-pressed={shipmentStatus === status && !delayedOnly}
                    onClick={() => { setLoadingSection(true); setShipmentStatus(status); setDelayedOnly(false); }}
                    className={`min-h-11 max-w-full rounded-full border px-3 py-2 text-center text-xs font-semibold leading-4 transition ${
                      shipmentStatus === status && !delayedOnly
                        ? "border-amber-400 bg-amber-400/10 text-amber-200"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-amber-400/40"
                    }`}
                  >
                    {status ? shipmentStatusLabel(t, status) : t("admin_all_statuses")}
                  </button>
                ))}
              </div>
            </div>
            {loadingSection ? <p className="p-5 text-sm text-zinc-400">{t("admin_shipments_loading")}</p>
              : shipments.length === 0 ? <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">{t("admin_shipments_empty")}</p>
                : (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(17rem,1fr)]">
                    <ul className="space-y-2 xl:hidden">
                      {shipments.map((shipment) => (
                        <li key={shipment.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedShipmentId(shipment.id)}
                            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950/80 p-4 text-left transition hover:border-amber-400/40"
                          >
                            <span className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-amber-200">#{shipment.id}{shipment.delayed ? ` · ${t("admin_delayed")}` : ""}</span>
                              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${shipmentStatusBadgeClass(shipment.status, shipment.delayed)}`}>
                                {shipmentStatusLabel(t, shipment.status)}
                              </span>
                            </span>
                            <span className="mt-3 grid gap-2 text-sm leading-5 min-[520px]:grid-cols-2">
                              <span className="min-w-0 break-words"><span className="text-zinc-500">{t("admin_customer")}: </span>{shipment.customerName}</span>
                              <span className="min-w-0 break-words"><span className="text-zinc-500">{t("admin_driver")}: </span>{shipment.driverName || t("admin_unassigned")}</span>
                              <span className="min-w-0 break-words"><span className="text-zinc-500">{t("admin_vehicle")}: </span>{shipment.vehiclePlateNumber || t("admin_not_linked")}</span>
                              <span className="min-w-0 break-words min-[520px]:col-span-2"><span className="text-zinc-500">{t("admin_route")}: </span>{shipment.origin} → {shipment.destination}</span>
                              <span className="break-words text-xs text-zinc-500 min-[520px]:col-span-2">{shipment.createdAt} · {shipment.updatedAt}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="hidden overflow-x-auto rounded-xl border border-white/10 xl:block">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-zinc-900 text-zinc-400"><tr>{["id", "customer", "driver", "vehicle", "route", "status", "created", "updated"].map((cell) => <th key={cell} className="px-3 py-3 font-medium">{t(`admin_column_${cell}`)}</th>)}</tr></thead>
                        <tbody className="divide-y divide-zinc-800">
                          {shipments.map((shipment) => (
                            <tr key={shipment.id} className={`cursor-pointer hover:bg-zinc-900 ${shipment.delayed ? "bg-red-950/20" : ""}`}
                              onClick={() => setSelectedShipmentId(shipment.id)}>
                              <td className="px-3 py-3 text-amber-200">#{shipment.id}{shipment.delayed ? ` · ${t("admin_delayed")}` : ""}</td>
                              <td className="px-3 py-3">{shipment.customerName}</td>
                              <td className="px-3 py-3">{shipment.driverName || t("admin_unassigned")}</td>
                              <td className="px-3 py-3">{shipment.vehiclePlateNumber || t("admin_not_linked")}</td>
                              <td className="max-w-[18rem] break-words px-3 py-3 leading-5">{shipment.origin} → {shipment.destination}</td>
                              <td className="px-3 py-3">
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${shipmentStatusBadgeClass(shipment.status, shipment.delayed)}`}>
                                  {shipmentStatusLabel(t, shipment.status)}
                                </span>
                              </td>
                              <td className="px-3 py-3">{shipment.createdAt}</td>
                              <td className="px-3 py-3">{shipment.updatedAt}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <aside className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
                      <h2 className="mb-3 font-semibold">{t("admin_shipment_status_history")}</h2>
                      {!selectedShipmentId ? <p className="text-sm text-zinc-500">{t("admin_select_shipment_history")}</p>
                        : shipmentHistory.length === 0 ? <p className="text-sm text-zinc-500">{t("admin_no_shipment_history")}</p>
                          : <ol className="space-y-3">{shipmentHistory.map((entry, index) => (
                            <li key={`${entry.timestamp}-${index}`} className="border-l border-amber-400/50 pl-3 text-sm">
                              <p className="font-medium text-amber-200">{shipmentStatusLabel(t, entry.status)}</p>
                              <p className="break-words leading-5 text-zinc-400">{entry.timestamp} · {entry.location || t("admin_no_location")}</p>
                            </li>
                          ))}</ol>}
                    </aside>
                  </div>
                )}
          </section>
        )}

        {activeSection === "users" && (
          <section className="space-y-4" aria-label={t("admin_section_users")}>
            <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{t("admin_users_title")}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{t("admin_users_hint")}</p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  {t("admin_users_count", { count: adminUsers.length })}
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <label className="relative min-w-0 flex-1">
                  <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={usersQuery}
                    onChange={(event) => setUsersQuery(event.target.value)}
                    placeholder={t("admin_search_users_placeholder")}
                    aria-label={t("admin_search_users")}
                    className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </label>
                <div className="flex flex-wrap gap-2 pb-1" role="group" aria-label={t("admin_filter_users")}>
                  {["ALL", "CUSTOMER", "DRIVER"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={userRoleFilter === role}
                      onClick={() => setUserRoleFilter(role)}
                      className={`min-h-11 max-w-full rounded-full border px-3 py-2 text-center text-xs font-semibold leading-4 transition ${
                        userRoleFilter === role
                          ? "border-amber-400 bg-amber-400 text-zinc-950"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-amber-400/50 hover:text-amber-200"
                      }`}
                    >
                      {t(`admin_user_role_filter_${role.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {loadingSection ? (
              <p className="rounded-xl border border-white/10 bg-zinc-950/80 p-5 text-sm text-zinc-400">{t("admin_users_loading")}</p>
            ) : visibleUsers.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-zinc-950/80 p-5 text-sm text-zinc-400">{t("admin_users_empty")}</p>
            ) : (
              <>
                <ul className="space-y-2 md:hidden">
                  {visibleUsers.map((adminUser) => (
                    <li key={adminUser.id} className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words font-semibold">{adminUser.fullName}</p>
                          <p className="mt-1 break-all text-xs text-zinc-400">{adminUser.email}</p>
                        </div>
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                          {t(`admin_user_role_${String(adminUser.role).toLowerCase()}`, { defaultValue: adminUser.role })}
                        </span>
                      </div>
                      <div className="mt-3 grid min-w-0 gap-1 break-words text-sm text-zinc-400 [overflow-wrap:anywhere]">
                        <span>{adminUser.phone || t("admin_not_provided")}</span>
                        {adminUser.companyName && <span>{adminUser.companyName}</span>}
                        <span className="text-xs text-zinc-600">{adminUser.createdAt || t("admin_not_provided")}</span>
                      </div>
                      {adminUser.approvalStatus && (
                        <span className="mt-3 inline-flex rounded-full border border-amber-500/30 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">
                          {t(`approval_${adminUser.approvalStatus}`)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        {["full_name", "email", "phone", "role", "company", "created", "status"].map((column) => (
                          <th key={column} className="px-4 py-3 font-semibold">{t(`admin_user_column_${column}`)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {visibleUsers.map((adminUser) => (
                        <tr key={adminUser.id} className="transition hover:bg-zinc-900/70">
                          <td className="px-4 py-3 font-medium text-zinc-100">{adminUser.fullName}</td>
                          <td className="px-4 py-3 text-zinc-400">{adminUser.email}</td>
                          <td className="px-4 py-3 text-zinc-400">{adminUser.phone || t("admin_not_provided")}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                              {t(`admin_user_role_${String(adminUser.role).toLowerCase()}`, { defaultValue: adminUser.role })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{adminUser.companyName || t("admin_not_provided")}</td>
                          <td className="px-4 py-3 text-zinc-500">{adminUser.createdAt || t("admin_not_provided")}</td>
                          <td className="px-4 py-3">
                            {adminUser.approvalStatus
                              ? t(`approval_${adminUser.approvalStatus}`)
                              : t("admin_user_status_registered")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {activeSection === "complaints" && (
          <section className="grid gap-4 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.4fr)]">
            <div className="space-y-3">
              <select value={complaintStatusFilter} onChange={(event) => { setLoadingSection(true); setComplaintStatusFilter(event.target.value); }}
                aria-label={t("admin_filter_complaint_status")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white">
                <option value="">{t("admin_all_complaint_statuses")}</option>
                {complaintStatuses.map((status) => <option key={status} value={status}>{complaintStatusLabel(t, status)}</option>)}
              </select>
              {loadingSection ? <p className="p-4 text-sm text-zinc-400">{t("admin_complaints_loading")}</p>
                : complaints.length === 0 ? <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-400">{t("admin_complaints_empty")}</p>
                  : complaints.map((complaint) => (
                    <button type="button" key={complaint.id} onClick={() => {
                      setSelectedComplaint({ id: complaint.id });
                      setComplaintResolution(complaint.resolutionNote || "");
                      setComplaintEvidence(null);
                      setComplaintActions([]);
                    }} className="w-full rounded-xl border border-white/10 bg-zinc-950/80 p-4 text-left hover:border-amber-400/50">
                      <span className="flex flex-wrap justify-between gap-2 font-semibold"><span>{t("admin_complaint_number", { id: complaint.id })}</span><span className="text-amber-200">{complaintStatusLabel(t, complaint.status)}</span></span>
                      <span className="mt-2 block break-words text-xs leading-5 text-zinc-400">{t("admin_shipment_number", { id: complaint.shipmentId })} · {complaint.reporterName}</span>
                      <span className="mt-2 block line-clamp-2 text-sm text-zinc-300">{complaint.description}</span>
                    </button>
                  ))}
            </div>
            <article className="min-w-0 rounded-xl border border-white/10 bg-zinc-950/80 p-5">
              {!selectedComplaint?.complaint ? <p className="text-sm text-zinc-500">{t("admin_select_complaint")}</p> : (
                <>
                    <h2 className="text-lg font-semibold">{t("admin_complaint_number", { id: selectedComplaint.complaint.id })}</h2>
                  <p className="mt-2 break-words text-sm leading-6 text-zinc-300">{selectedComplaint.complaint.description}</p>
                    <p className="mt-2 break-words text-xs leading-5 text-zinc-500">{t("admin_shipment_number", { id: selectedComplaint.complaint.shipmentId })} · {selectedComplaint.complaint.reporterName} · {t("admin_assigned_reviewer")}: {selectedComplaint.complaint.assignedReviewerName || t("admin_unassigned")}</p>
                  {complaintEvidence && (
                    <div className="my-4">
                      {complaintEvidence.contentType === "application/pdf"
                          ? <iframe title={t("admin_complaint_evidence")} src={`data:application/pdf;base64,${complaintEvidence.base64Data}`} className="h-80 w-full rounded-lg bg-white" />
                          : <img alt={t("admin_complaint_evidence")} src={`data:${complaintEvidence.contentType};base64,${complaintEvidence.base64Data}`} className="max-h-80 rounded-lg object-contain" />}
                    </div>
                  )}
                    <h3 className="mt-4 font-medium">{t("admin_shipment_history")}</h3>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-auto text-xs text-zinc-400">
                      {selectedComplaint.shipmentHistory.map((entry, index) => <li key={`${entry.timestamp}-${index}`}>{entry.timestamp} · {shipmentStatusLabel(t, entry.status)} · {entry.location || t("admin_no_location")}</li>)}
                  </ul>
                    <label className="mt-4 block text-sm text-zinc-300">{t("admin_resolution_status")}
                    <select value={selectedComplaint.complaint.status}
                      onChange={(event) => setSelectedComplaint((current) => ({
                        ...current, complaint: { ...current.complaint, status: event.target.value },
                      }))}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white">
                      {complaintStatuses.map((status) => <option key={status} value={status}>{complaintStatusLabel(t, status)}</option>)}
                    </select>
                  </label>
                  <label className="mt-3 block text-sm text-zinc-300">{t("admin_resolution_note")}
                    <textarea value={complaintResolution} maxLength={1000} onChange={(event) => setComplaintResolution(event.target.value)}
                      placeholder={t("admin_resolution_note_placeholder")}
                      className="mt-1 min-h-20 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" />
                  </label>
                  <button type="button" onClick={updateComplaint} className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950">{t("admin_save_complaint_update")}</button>
                  <h3 className="mt-5 font-medium">{t("admin_recorded_actions")}</h3>
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
                      <p className="mt-1 text-sm text-amber-100">TSh {Number(payment.amount).toLocaleString(locale)} · {payment.reference}</p>
                      <p className="mt-1 text-xs text-zinc-500">{payment.submittedAt ? new Date(payment.submittedAt).toLocaleString(locale) : ""}</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button type="button" disabled={acting} onClick={() => reviewCommissionPayment(payment.id, "reject")} className="min-h-11 w-full rounded-lg border border-rose-200/25 px-3 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-200/10 disabled:opacity-50 sm:w-auto">{t("admin_commission_reject")}</button>
                      <button type="button" disabled={acting} onClick={() => reviewCommissionPayment(payment.id, "verify")} className="min-h-11 w-full rounded-lg bg-emerald-200 px-3 py-2 text-sm font-bold text-zinc-950 hover:bg-emerald-100 disabled:opacity-50 sm:w-auto">{t("admin_commission_verify")}</button>
                    </div>
                  </article>
                ))}
          </section>
        )}

        {activeSection === "notifications" && (
          <section className="space-y-3">
            <div className="flex justify-end"><button type="button" disabled={!unreadCount} onClick={markAllNotificationsRead} className="rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-200 disabled:opacity-40">{t("admin_mark_all_read")}</button></div>
            {loadingSection ? <p className="p-5 text-sm text-zinc-400">{t("admin_notifications_loading")}</p>
              : notifications.length === 0 ? <p className="rounded-xl border border-white/10 p-5 text-sm text-zinc-400">{t("admin_notifications_empty")}</p>
                : notifications.map((notification) => (
                  <article key={notification.id} className={`rounded-xl border p-4 ${notification.read ? "border-white/10 bg-zinc-950/70" : "border-amber-400/40 bg-amber-400/5"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-medium">{notification.message}</p><p className="mt-1 text-xs text-zinc-400">{notification.type} · {notification.priority} · {notification.timestamp}</p></div>
                      <div className="flex flex-wrap gap-3">
                        {notification.relatedLink && <a href={notification.relatedLink} className="text-sm text-amber-200 underline">{t("admin_open_related_record")}</a>}
                        {!notification.read && <button type="button" onClick={() => markNotificationRead(notification.id)} className="text-sm text-amber-200 underline">{t("admin_mark_read")}</button>}
                      </div>
                    </div>
                  </article>
                ))}
          </section>
        )}

        {activeSection === "audit" && (
          <section className="overflow-hidden rounded-xl border border-white/10">
            {loadingSection ? <p className="p-5 text-sm text-zinc-400">{t("admin_audit_loading")}</p>
              : auditEntries.length === 0 ? <p className="p-5 text-sm text-zinc-400">{t("admin_audit_empty")}</p>
                : <>
                  <ul className="divide-y divide-zinc-800 xl:hidden">
                    {auditEntries.map((entry) => (
                      <li key={entry.id} className="space-y-2 bg-zinc-950/80 p-4 text-sm">
                        <p className="break-words font-semibold text-amber-200">{entry.action}</p>
                        <dl className="grid gap-2 text-xs min-[420px]:grid-cols-2">
                          <div><dt className="text-zinc-500">{t("admin_column_time")}</dt><dd className="break-words text-zinc-200">{entry.timestamp}</dd></div>
                          <div><dt className="text-zinc-500">{t("admin_column_actor_id")}</dt><dd className="text-zinc-200">{entry.actorId}</dd></div>
                          <div><dt className="text-zinc-500">{t("admin_column_record")}</dt><dd className="break-words text-zinc-200">{entry.recordType} #{entry.recordId}</dd></div>
                          <div className="min-w-0"><dt className="text-zinc-500">{t("admin_column_metadata")}</dt><dd className="break-words text-zinc-200">{entry.metadata}</dd></div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto xl:block">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead className="bg-zinc-900 text-zinc-400"><tr>{["time", "actor_id", "action", "record", "metadata"].map((header) => <th key={header} className="px-3 py-3">{t(`admin_column_${header}`)}</th>)}</tr></thead>
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
            {!health ? <p className="text-sm text-zinc-400">{loadingSection ? t("admin_health_loading") : t("admin_health_unavailable")}</p>
              : <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  [t("admin_health_api"), health.api],
                  [t("admin_health_database"), health.database],
                  [t("admin_health_backups"), health.backups],
                  [t("admin_health_last_backup"), health.lastBackupSuccess || t("admin_not_verified")],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-zinc-800 p-4"><dt className="text-sm text-zinc-400">{label}</dt><dd className={`mt-1 font-semibold ${value === "UP" ? "text-emerald-300" : "text-amber-200"}`}>{["UP", "DOWN", "UNKNOWN"].includes(String(value).toUpperCase()) ? t(`admin_health_status_${String(value).toLowerCase()}`) : value}</dd></div>
                ))}
                <p className="text-xs text-amber-200 sm:col-span-2">{t("admin_backup_disclaimer")}</p>
              </dl>}
          </section>
        )}

        {activeSection === "drivers" && (
          <>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("admin_driver_verification_queue")}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t("admin_driver_queue_hint")}</p>
          </div>
          <label className="relative w-full sm:max-w-xs">
            <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={driversQuery}
              onChange={(event) => setDriversQuery(event.target.value)}
              placeholder={t("admin_search_drivers_placeholder")}
              aria-label={t("admin_search_drivers")}
              className="min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </label>
        </div>
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
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                statusFilter === status
                  ? "border-amber-400 bg-amber-400 text-zinc-950"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400/60 hover:text-amber-200"
              }`}
            >
              {status === "ALL" ? t("admin_all_drivers") : t(`approval_${status}`)}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-4">
              <h2 className="font-semibold">{t("admin_registered_drivers")}</h2>
              <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
                {visibleDrivers.length}
              </span>
            </div>
            {loadingDrivers ? (
              <p className="p-5 text-sm text-zinc-400">{t("admin_loading_drivers")}</p>
              ) : visibleDrivers.length === 0 ? (
                <p className="p-5 text-sm text-zinc-500">{drivers.length === 0 ? t("admin_no_drivers") : t("admin_search_empty")}</p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                  {visibleDrivers.map((driver) => (
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
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button
                      type="button"
                      disabled={acting || review.driver.approvalStatus === "APPROVED"}
                      onClick={() => setApprovalConfirmation("approve")}
                      className="min-h-11 w-full rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                      {acting ? t("admin_saving") : t("admin_approve")}
                    </button>
                    <button
                      type="button"
                      disabled={acting || review.driver.approvalStatus === "REJECTED"}
                      onClick={() => setApprovalConfirmation("reject")}
                      className="min-h-11 w-full rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
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
          </div>
        {approvalConfirmation && review && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="admin-approval-confirmation-title"
              className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span className={`rounded-xl p-2 ${approvalConfirmation === "approve" ? "bg-amber-400/10 text-amber-300" : "bg-red-500/10 text-red-300"}`}>
                  {approvalConfirmation === "approve" ? <CheckCircle2 size={20} aria-hidden="true" /> : <AlertTriangle size={20} aria-hidden="true" />}
                </span>
                <div>
                  <h2 id="admin-approval-confirmation-title" className="font-semibold">
                    {t("admin_confirmation_title")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {t(approvalConfirmation === "approve" ? "admin_confirm_approve" : "admin_confirm_reject", {
                      name: review.driver.fullName,
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => setApprovalConfirmation(null)}
                  className="min-h-11 w-full rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 disabled:opacity-50 sm:w-auto"
                >
                  {t("admin_confirmation_cancel")}
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => updateApproval(approvalConfirmation)}
                  className={`min-h-11 w-full rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 sm:w-auto ${
                    approvalConfirmation === "approve"
                      ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                      : "bg-red-500 text-white hover:bg-red-400"
                  }`}
                >
                  {acting ? t("admin_saving") : t(approvalConfirmation === "approve" ? "admin_approve" : "admin_reject")}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;
