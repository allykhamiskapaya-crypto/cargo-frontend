import { useEffect, useState } from "react";
import { ArrowRight, Check, MapPin, Package, Route, Truck, Weight } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import ServiceTypeSelector from "../components/ServiceTypeSelector";
import { serviceTypeIds } from "../constants/serviceTypes";

const geocodingCache = new Map();
const routeDistanceCache = new Map();

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

async function calculateDrivingDistanceKm(origin, destination, signal) {
  const [originPoint, destinationPoint] = await Promise.all([
    resolveRoutePoint(origin, signal),
    resolveRoutePoint(destination, signal),
  ]);
  const cacheKey = [...originPoint, ...destinationPoint].join(",");
  if (routeDistanceCache.has(cacheKey)) return routeDistanceCache.get(cacheKey);

  const coordinates = `${originPoint[1]},${originPoint[0]};${destinationPoint[1]},${destinationPoint[0]}`;
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`,
    { signal },
  );
  if (!response.ok) throw new Error("Road route lookup failed");
  const route = (await response.json()).routes?.[0];
  if (!Number.isFinite(route?.distance) || route.distance < 0) throw new Error("Road route not found");

  const distanceKm = Number((route.distance / 1000).toFixed(2));
  routeDistanceCache.set(cacheKey, distanceKm);
  return distanceKm;
}

function Booking() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem("user"));
  const requestedService = searchParams.get("service");
  const [selectedService, setSelectedService] = useState(
    serviceTypeIds.includes(requestedService) ? requestedService : "",
  );
  const [formData, setFormData] = useState({
    origin: "",
    destination: searchParams.get("destination") || "",
    cargoType: "",
    weightKg: "1",
    distanceKm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [routeStatus, setRouteStatus] = useState("idle");
  const quotedPrice = formData.distanceKm !== ""
    && Number.isFinite(Number(formData.distanceKm)) && Number(formData.distanceKm) >= 0
    && Number.isFinite(Number(formData.weightKg)) && Number(formData.weightKg) > 0
    ? Math.round(5000 + (Number(formData.distanceKm) * Number(formData.weightKg) * 1000))
    : null;

  useEffect(() => {
    const origin = formData.origin.trim();
    const destination = formData.destination.trim();
    if (!origin || !destination) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setRouteStatus("calculating");
      try {
        const distanceKm = await calculateDrivingDistanceKm(origin, destination, controller.signal);
        setFormData((current) => ({ ...current, distanceKm: distanceKm.toFixed(2) }));
        setRouteStatus("ready");
      } catch (routeError) {
        if (routeError.name !== "AbortError") setRouteStatus("error");
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
      setFormData((current) => ({ ...current, [name]: value, distanceKm: "" }));
      return;
    }
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedService) {
      setError(t("service_required"));
      return;
    }
    if (routeStatus !== "ready" || formData.distanceKm === "") {
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
        weightKg: Number(formData.weightKg),
        distanceKm: Number(formData.distanceKm),
      });
      navigate(`/tracking?id=${response.data.id}`);
    } catch {
      setError(t("backend_error"));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-3 text-sm text-white placeholder-zinc-500 transition focus:border-amber-300/50 focus:outline-none focus:ring-2 focus:ring-amber-300/15";

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.11),_transparent_65%)]" />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-8 max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/75">{t("booking_eyebrow")}</p>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t("booking_title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">{t("booking_subtitle")}</p>
        </header>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-white/[0.08] bg-zinc-950/60 p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200">
                  <Route size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-white">{t("booking_locations_section")}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{t("booking_locations_section_hint")}</p>
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
                    placeholder="Dar es Salaam or -6.79,39.20"
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
                    placeholder="Mwanza or -2.51,32.90"
                    className={inputClass}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/[0.08] bg-zinc-950/60 p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">
                  <Package size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-white">{t("booking_cargo_section")}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{t("booking_cargo_section_hint")}</p>
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
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-300">
                  <span className="mb-2 flex items-center gap-2"><Weight size={14} aria-hidden="true" />{t("weight_kg")}</span>
                  <input type="number" name="weightKg" min="0.01" step="0.01" required value={formData.weightKg} onChange={handleChange} className={inputClass} />
                </label>
                <label className="block text-sm font-medium text-zinc-300">
                  <span className="mb-2 block">{t("route_distance_km")}</span>
                  <input type="text" name="distanceKm" readOnly value={formData.distanceKm} placeholder="—" aria-describedby="booking-route-status" className={`${inputClass} cursor-default text-amber-100`} />
                  <span id="booking-route-status" role="status" aria-live="polite" className={`mt-2 block text-xs ${routeStatus === "error" ? "text-rose-200" : routeStatus === "ready" ? "text-emerald-200" : "text-zinc-500"}`}>
                    {routeStatus === "calculating" ? t("booking_route_calculating")
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
                  <h2 className="font-semibold text-white">{t("booking_vehicle_section")}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{t("booking_vehicle_section_hint")}</p>
                </div>
              </div>
              <ServiceTypeSelector selectedService={selectedService} onChange={setSelectedService} />
              {selectedService && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-3 py-1.5 text-xs text-zinc-300">
                  <Check size={14} className="text-amber-200" aria-hidden="true" />
                  {t("booking_service_selected")}: <span className="font-medium text-amber-100">{t(`service_${selectedService.toLowerCase()}`)}</span>
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
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">{t("service_type")}</span>
                  <span className="text-right font-medium text-zinc-100">
                    {selectedService ? t(`service_${selectedService.toLowerCase()}`) : t("booking_summary_not_selected")}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-zinc-400">{t("cargo_type")}</span>
                  <span className="max-w-[60%] text-right font-medium text-zinc-100">
                    {formData.cargoType.trim() || t("booking_summary_not_selected")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">{t("weight_kg")}</span>
                  <span className="font-medium text-zinc-100">{formData.weightKg || "—"} kg</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-400">{t("route_distance_km")}</span>
                  <span className="font-medium text-zinc-100">{formData.distanceKm ? `${formData.distanceKm} km` : "—"}</span>
                </div>
              </div>

              <div className="py-5">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{t("booking_estimated_cost")}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-amber-100">
                  {quotedPrice == null ? t("booking_estimated_cost_value") : `TSh ${quotedPrice.toLocaleString()}`}
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{t("booking_estimated_cost_note")}</p>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedService || routeStatus !== "ready"}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/10 transition hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? t("booking_loading") : t("booking_submit")}
                {!loading && <ArrowRight size={17} aria-hidden="true" />}
              </button>
            </section>
          </aside>
        </form>
      </div>
    </main>
  );
}

export default Booking;
