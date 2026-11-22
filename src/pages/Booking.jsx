import { useEffect, useState } from "react";
import { ArrowRight, Check, MapPin, Package, Route, Truck, X } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import CustomerLiveMap from "../components/CustomerLiveMap";
import ServiceTypeSelector from "../components/ServiceTypeSelector";
import { serviceTypeIds } from "../constants/serviceTypes";
import { isWithinAllowedServiceArea } from "../utils/serviceArea";

const geocodingCache = new Map();

async function resolveRoutePoint(location, signal) {
  const normalizedLocation = location.trim().toLowerCase();
  const coordinateMatch = location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1]);
    const longitude = Number(coordinateMatch[2]);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return [latitude, longitude];
    }
  }
  if (geocodingCache.has(normalizedLocation)) return geocodingCache.get(normalizedLocation);

  const response = await fetch(
    `https://photon.komoot.io/api/?limit=1&lat=-6.8&lon=39.2&q=${encodeURIComponent(`${location}, Tanzania`)}`,
    { signal },
  );
  if (!response.ok) throw new Error("Address lookup failed");
  const feature = (await response.json()).features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) throw new Error("Address not found");

  const point = [Number(coordinates[1]), Number(coordinates[0])];
  geocodingCache.set(normalizedLocation, point);
  return point;
}

async function estimateShipment(origin, destination, signal) {
  const [originPoint, destinationPoint] = await Promise.all([
    resolveRoutePoint(origin, signal),
    resolveRoutePoint(destination, signal),
  ]);
  if (!isWithinAllowedServiceArea(originPoint) || !isWithinAllowedServiceArea(destinationPoint)) {
    const error = new Error("OUTSIDE_SERVICE_AREA");
    error.code = "OUTSIDE_SERVICE_AREA";
    throw error;
  }
  const response = await api.post("/shipments/estimate", {
    pickupLatitude: originPoint[0],
    pickupLongitude: originPoint[1],
    dropoffLatitude: destinationPoint[0],
    dropoffLongitude: destinationPoint[1],
  }, { signal });
  return {
    ...response.data,
    pickupCoordinates: originPoint,
    dropoffCoordinates: destinationPoint,
  };
}

function Booking({ mobileHome = false }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "sw" ? "sw-TZ" : "en-TZ";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem("user"));
  const requestedService = searchParams.get("service");
  const [selectedService, setSelectedService] = useState(
    serviceTypeIds.includes(requestedService) ? requestedService : "",
  );
  const [formData, setFormData] = useState({
    origin: searchParams.get("origin") || "",
    destination: searchParams.get("destination") || "",
    cargoType: "",
    distanceKm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [routeStatus, setRouteStatus] = useState("idle");
  const [estimatedPrices, setEstimatedPrices] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [recentDestinations, setRecentDestinations] = useState([]);
  const [recentDestinationsStatus, setRecentDestinationsStatus] = useState("loading");
  const [nearbyAvailability, setNearbyAvailability] = useState({
    counts: {},
    status: "loading",
  });
  const [mobileRouteSheetOpen, setMobileRouteSheetOpen] = useState(false);

  useEffect(() => {
    if (!mobileRouteSheetOpen) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const desktopViewport = window.matchMedia("(min-width: 768px)");
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileRouteSheetOpen(false);
    };
    const closeOnDesktop = (event) => {
      if (event.matches) setMobileRouteSheetOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    desktopViewport.addEventListener("change", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      desktopViewport.removeEventListener("change", closeOnDesktop);
    };
  }, [mobileRouteSheetOpen]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const controller = new AbortController();
    const loadRecentDestinations = async () => {
      try {
        const response = await api.get(`/shipments/customer/${user.id}`, {
          signal: controller.signal,
        });
        const seenDestinations = new Set();
        const destinations = (Array.isArray(response.data) ? response.data : [])
          .sort((first, second) => (
            new Date(second.updatedAt || second.createdAt || 0)
              - new Date(first.updatedAt || first.createdAt || 0)
          ))
          .map((shipment) => shipment.destination?.trim())
          .filter((destination) => {
            if (!destination) return false;
            const key = destination.toLowerCase();
            if (seenDestinations.has(key)) return false;
            seenDestinations.add(key);
            return true;
          })
          .slice(0, 4);
        setRecentDestinations(destinations);
        setRecentDestinationsStatus("ready");
      } catch {
        if (!controller.signal.aborted) setRecentDestinationsStatus("error");
      }
    };

    loadRecentDestinations();
    return () => controller.abort();
  }, [user?.id]);

  useEffect(() => {
    const origin = formData.origin.trim();
    const destination = formData.destination.trim();
    if (!origin || !destination) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setRouteStatus("calculating");
      setEstimatedPrices(null);
      setRouteCoordinates(null);
      try {
        const estimate = await estimateShipment(origin, destination, controller.signal);
        const distanceKm = Number(estimate.distanceKm);
        const prices = estimate.pricesByVehicleType;
        const pricesAreValid = prices && serviceTypeIds.every(
          (serviceId) => Number.isFinite(Number(prices[serviceId])),
        );
        if (!Number.isFinite(distanceKm) || distanceKm <= 0 || !pricesAreValid) {
          throw new Error("Invalid shipment estimate");
        }
        setFormData((current) => ({ ...current, distanceKm: distanceKm.toFixed(2) }));
        setEstimatedPrices(prices);
        setRouteCoordinates({
          pickup: estimate.pickupCoordinates,
          dropoff: estimate.dropoffCoordinates,
        });
        setRouteStatus("ready");
      } catch (routeError) {
        if (routeError.name !== "AbortError" && !controller.signal.aborted) {
          setFormData((current) => ({ ...current, distanceKm: "" }));
          setRouteStatus(
            routeError.code === "OUTSIDE_SERVICE_AREA"
              || routeError.response?.data?.code === "OUTSIDE_SERVICE_AREA"
              ? "outside"
              : "error",
          );
        }
      }
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [formData.destination, formData.origin]);

  if (!user) return <Navigate to="/login" replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "origin" || name === "destination") {
      setRouteStatus("idle");
      setEstimatedPrices(null);
      setRouteCoordinates(null);
      setFormData((current) => ({ ...current, [name]: value, distanceKm: "" }));
      return;
    }
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleRecentDestinationSelect = (destination) => {
    setError("");
    setRouteStatus("idle");
    setEstimatedPrices(null);
    setRouteCoordinates(null);
    setFormData((current) => ({
      ...current,
      destination,
      distanceKm: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedService) {
      setError(t("service_required"));
      return;
    }
    if (routeStatus !== "ready" || !routeCoordinates || formData.distanceKm === "" || Number(formData.distanceKm) <= 0) {
      setError(t("booking_route_error"));
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/shipments", {
        customerId: user.id,
        origin: formData.origin,
        destination: formData.destination,
        cargoType: formData.cargoType.trim(),
        vehicleType: selectedService,
        distanceKm: Number(formData.distanceKm),
        pickupLatitude: routeCoordinates.pickup[0],
        pickupLongitude: routeCoordinates.pickup[1],
        dropoffLatitude: routeCoordinates.dropoff[0],
        dropoffLongitude: routeCoordinates.dropoff[1],
      });
      navigate(`/tracking?id=${response.data.id}`);
    } catch {
      setError(t("backend_error"));
    } finally {
      setLoading(false);
    }
  };

  const selectedPrice = selectedService ? estimatedPrices?.[selectedService] : null;
  const canSubmit = !loading && Boolean(selectedService)
    && routeStatus === "ready" && Boolean(routeCoordinates);

  const inputClass = "w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-white placeholder-zinc-500 transition focus:border-amber-300/50 focus:outline-none focus:ring-2 focus:ring-amber-300/15";
  const Main = mobileHome ? "div" : "main";

  return (
    <Main className={mobileHome
      ? "relative overflow-x-clip text-white md:hidden"
      : "relative min-h-[calc(100vh-4rem)] overflow-x-clip text-white"}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.11),_transparent_65%)]" />
      <div className={mobileHome
        ? "mx-auto max-w-7xl px-0 py-0"
        : "mx-auto max-w-7xl px-4 py-8 pb-[calc(10rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-12 lg:px-8 md:pb-0"}
      >
        {!mobileHome && (
          <header className="mb-8 max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/75">{t("booking_eyebrow")}</p>
            <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-4xl">{t("booking_title")}</h1>
            <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-zinc-400 sm:text-base">{t("booking_subtitle")}</p>
          </header>
        )}

        {error && (
          <div role="alert" className="mb-6 hidden rounded-2xl border border-red-400/25 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200 md:block">
            {error}
          </div>
        )}

        <section className="mb-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/60 shadow-xl shadow-black/10 backdrop-blur-xl">
          <div className="flex flex-col gap-2 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="min-w-0">
              <h2 className="font-semibold text-white">{t("booking_nearby_drivers_title")}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t("booking_nearby_drivers_hint")}</p>
            </div>
            {routeCoordinates && (
              <span className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-amber-300/20 bg-amber-300/[0.06] px-3 py-1.5 text-xs font-medium text-amber-100 sm:shrink-0 sm:self-auto">
                <Route size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {t("booking_route_preview")}
                  {formData.distanceKm && ` · ${formData.distanceKm} km`}
                </span>
              </span>
            )}
          </div>
          <div className="relative min-h-[300px] sm:min-h-[400px]">
            <CustomerLiveMap
              routeCoordinates={routeCoordinates}
              onAvailabilityChange={setNearbyAvailability}
            />
          </div>
        </section>

        <form id="shipment-booking-form" onSubmit={handleSubmit} className="hidden items-start gap-5 md:grid lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-white/[0.08] bg-zinc-950/60 p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200">
                  <Route size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="break-words font-semibold text-white">{t("booking_locations_section")}</h2>
                  <p className="mt-1 break-words text-sm leading-5 text-zinc-500">{t("booking_locations_section_hint")}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-300">
                  <span className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />{t("origin")}
                  </span>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    required
                    placeholder={t("booking_origin_placeholder")}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-300">
                  <span className="mb-2 flex items-center gap-2">
                    <MapPin size={14} className="text-rose-300" aria-hidden="true" />{t("destination")}
                  </span>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                    placeholder={t("booking_destination_placeholder")}
                    className={inputClass}
                  />
                </label>
              </div>
              {recentDestinations.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("booking_recent_destinations")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentDestinations.map((recentDestination) => (
                      <button
                        key={recentDestination}
                        type="button"
                        onClick={() => handleRecentDestinationSelect(recentDestination)}
                        className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs font-medium text-zinc-300 transition hover:border-amber-300/30 hover:bg-amber-300/[0.06] hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                      >
                        <MapPin size={14} className="shrink-0 text-amber-200" aria-hidden="true" />
                        <span className="max-w-[15rem] truncate">{recentDestination}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {recentDestinationsStatus === "error" && (
                <p role="status" className="mt-3 text-xs text-zinc-500">
                  {t("booking_recent_destinations_error")}
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-white/[0.08] bg-zinc-950/60 p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">
                  <Package size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="break-words font-semibold text-white">{t("booking_cargo_section")}</h2>
                  <p className="mt-1 break-words text-sm leading-5 text-zinc-500">{t("booking_cargo_section_hint")}</p>
                </div>
              </div>
              <label className="block text-sm font-medium text-zinc-300">
                <span className="mb-2 block">{t("cargo_type")}</span>
                <input
                  type="text"
                  name="cargoType"
                  value={formData.cargoType}
                  onChange={handleChange}
                  required
                  maxLength={100 - `${selectedService}: `.length}
                  placeholder={t("cargo_type_placeholder")}
                  className={inputClass}
                />
              </label>
              <div className="mt-4">
                <label className="block text-sm font-medium text-zinc-300">
                  <span className="mb-2 block">{t("route_distance_km")}</span>
                  <input type="text" name="distanceKm" readOnly value={formData.distanceKm} placeholder="—" aria-describedby="booking-route-status" className={`${inputClass} cursor-default text-amber-100`} />
                  <span id="booking-route-status" role={routeStatus === "outside" ? "alert" : "status"} aria-live="polite" className={`mt-2 block text-xs ${routeStatus === "error" || routeStatus === "outside" ? "text-rose-200" : routeStatus === "ready" ? "text-emerald-200" : "text-zinc-500"}`}>
                    {routeStatus === "outside" ? t("booking_service_area_restriction")
                      : routeStatus === "calculating" ? t("booking_route_calculating")
                      : routeStatus === "ready" ? t("booking_route_ready")
                        : routeStatus === "error" ? t("booking_route_error")
                          : formData.origin.trim() && formData.destination.trim() ? t("booking_route_waiting") : t("booking_route_hint")}
                  </span>
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[0.08] bg-zinc-950/60 p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-300/10 text-violet-200">
                  <Truck size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="break-words font-semibold text-white">{t("booking_vehicle_section")}</h2>
                  <p className="mt-1 break-words text-sm leading-5 text-zinc-500">{t("booking_vehicle_section_hint")}</p>
                </div>
              </div>
              <ServiceTypeSelector
                selectedService={selectedService}
                onChange={setSelectedService}
                prices={estimatedPrices || {}}
                availableVehicleCounts={nearbyAvailability.counts}
                availabilityStatus={nearbyAvailability.status}
              />
              {selectedService && (
                <p className="mt-4 flex w-fit max-w-full items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-xs leading-5 text-zinc-300">
                  <Check size={14} className="mt-0.5 shrink-0 text-amber-200" aria-hidden="true" />
                  <span className="min-w-0 break-words">{t("booking_service_selected")}: <span className="font-medium text-amber-100">{t(`service_${selectedService.toLowerCase()}`)}</span></span>
                </p>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24">
            <section className="overflow-hidden rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.08] via-zinc-950/80 to-zinc-950/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">{t("booking_summary_eyebrow")}</p>
              <h2 className="mt-2 text-xl font-bold text-white">{t("booking_summary_title")}</h2>

              <div className="my-6 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <div className="relative space-y-5">
                  <div className="absolute bottom-2 left-[5px] top-2 border-l border-dashed border-zinc-600" />
                  <div className="relative flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full border-2 border-emerald-200 bg-zinc-950" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{t("origin")}</p>
                      <p className="mt-0.5 break-words text-sm font-medium text-white">{formData.origin.trim() || t("booking_summary_location_placeholder")}</p>
                    </div>
                  </div>
                  <div className="relative flex items-start gap-3">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-rose-300" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{t("destination")}</p>
                      <p className="mt-0.5 break-words text-sm font-medium text-white">{formData.destination.trim() || t("booking_summary_location_placeholder")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-b border-white/[0.08] pb-5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-400">{t("service_type")}</span>
                  <span className="min-w-0 max-w-[60%] break-words text-right font-medium text-zinc-100">
                    {selectedService ? t(`service_${selectedService.toLowerCase()}`) : t("booking_summary_not_selected")}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-400">{t("cargo_type")}</span>
                  <span className="min-w-0 max-w-[60%] break-words text-right font-medium text-zinc-100">
                    {formData.cargoType.trim() || t("booking_summary_not_selected")}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-400">{t("route_distance_km")}</span>
                  <span className="shrink-0 font-medium text-zinc-100">{formData.distanceKm ? `${formData.distanceKm} km` : "—"}</span>
                </div>
              </div>

              <div className="py-5">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("booking_estimated_cost")}</p>
                <p className="mt-1 text-xl font-bold leading-tight tracking-tight text-amber-100 [overflow-wrap:anywhere] sm:text-2xl">
                  {selectedPrice == null ? t("booking_estimated_cost_value") : `TZS ${Number(selectedPrice).toLocaleString(locale)}`}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{t("booking_estimated_cost_note")}</p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="hidden min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/10 transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex"
              >
                {loading ? t("booking_loading") : t("booking_submit")}
                {!loading && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </section>
          </aside>
        </form>
      </div>
      {mobileRouteSheetOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center md:hidden">
          <button
            type="button"
            aria-label={t("booking_close_route_sheet")}
            onClick={() => setMobileRouteSheetOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <form
            id="mobile-shipment-booking-form"
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-route-sheet-title"
            className="relative flex max-h-[92vh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50"
          >
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4">
              <div className="min-w-0">
                <h2 id="mobile-route-sheet-title" className="text-lg font-bold text-white">
                  {t("booking_where_to")}
                </h2>
                <p className="mt-1 text-sm leading-5 text-zinc-400">
                  {t("booking_route_sheet_hint")}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("booking_close_route_sheet")}
                onClick={() => setMobileRouteSheetOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:border-amber-300/30 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
              <section className="space-y-3">
                <label className="block text-sm font-medium text-zinc-300">
                  <span className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    {t("origin")}
                  </span>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    required
                    placeholder={t("booking_origin_placeholder")}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-medium text-zinc-300">
                  <span className="mb-2 flex items-center gap-2">
                    <MapPin size={14} className="text-rose-300" aria-hidden="true" />
                    {t("destination")}
                  </span>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    required
                    placeholder={t("booking_destination_placeholder")}
                    className={inputClass}
                  />
                </label>

                {recentDestinations.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("booking_recent_destinations")}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {recentDestinations.map((recentDestination) => (
                        <button
                          key={recentDestination}
                          type="button"
                          onClick={() => handleRecentDestinationSelect(recentDestination)}
                          className="inline-flex min-h-11 max-w-[14rem] shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs font-medium text-zinc-300 transition hover:border-amber-300/30 hover:bg-amber-300/[0.06] hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                        >
                          <MapPin size={14} className="shrink-0 text-amber-200" aria-hidden="true" />
                          <span className="truncate">{recentDestination}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {recentDestinationsStatus === "error" && (
                  <p role="status" className="text-xs text-zinc-500">
                    {t("booking_recent_destinations_error")}
                  </p>
                )}
              </section>

              {formData.origin.trim() && formData.destination.trim() && (
                <p
                  id="mobile-booking-route-status"
                  role={routeStatus === "outside" ? "alert" : "status"}
                  aria-live="polite"
                  className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
                    routeStatus === "error" || routeStatus === "outside"
                      ? "border-rose-300/20 bg-rose-300/[0.06] text-rose-200"
                      : routeStatus === "ready"
                        ? "border-emerald-300/20 bg-emerald-300/[0.05] text-emerald-200"
                        : "border-white/10 bg-white/[0.03] text-zinc-400"
                  }`}
                >
                  {routeStatus === "outside" ? t("booking_service_area_restriction")
                    : routeStatus === "calculating" ? t("booking_route_calculating")
                    : routeStatus === "ready"
                      ? `${t("booking_route_ready")} ${formData.distanceKm} km`
                      : routeStatus === "error" ? t("booking_route_error")
                        : t("booking_route_waiting")}
                </p>
              )}

              <label className="block text-sm font-medium text-zinc-300">
                <span className="mb-2 block">{t("cargo_type")}</span>
                <input
                  type="text"
                  name="cargoType"
                  value={formData.cargoType}
                  onChange={handleChange}
                  required
                  maxLength={100 - `${selectedService}: `.length}
                  placeholder={t("cargo_type_placeholder")}
                  className={inputClass}
                />
              </label>

              {formData.origin.trim() && formData.destination.trim() && (
                <section className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-white">{t("booking_vehicle_section")}</h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {t("booking_vehicle_section_hint")}
                    </p>
                  </div>
                  <ServiceTypeSelector
                    selectedService={selectedService}
                    onChange={setSelectedService}
                    prices={estimatedPrices || {}}
                    availableVehicleCounts={nearbyAvailability.counts}
                    availabilityStatus={nearbyAvailability.status}
                    pendingFareLabel={
                      routeStatus === "calculating" || routeStatus === "idle"
                        ? t("booking_route_calculating")
                        : t("booking_vehicle_fare_unavailable")
                    }
                  />
                </section>
              )}
            </div>

            <div className="border-t border-white/10 bg-zinc-950/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {error && (
                <p role="alert" className="mb-3 rounded-xl border border-red-400/25 bg-red-400/[0.08] px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={!canSubmit || !formData.cargoType.trim()}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/10 transition hover:from-amber-200 hover:to-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? t("booking_loading") : t("booking_submit")}
                {!loading && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setMobileRouteSheetOpen(true)}
        className={`fixed inset-x-3 ${
          mobileHome
            ? "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)]"
        } z-50 mx-auto flex min-h-14 max-w-2xl items-center gap-3 rounded-2xl border border-amber-300/20 bg-zinc-950/95 px-4 py-3 text-left text-white shadow-xl shadow-black/40 backdrop-blur-xl transition hover:border-amber-300/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 md:hidden`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">
          <MapPin size={19} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{t("booking_where_to")}</span>
          <span className="mt-0.5 block truncate text-xs text-zinc-400">
            {formData.origin.trim() && formData.destination.trim()
              ? `${formData.origin.trim()} → ${formData.destination.trim()}`
              : t("booking_where_to_hint")}
          </span>
        </span>
      </button>
    </Main>
  );
}

export default Booking;
