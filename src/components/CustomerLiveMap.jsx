import { useEffect, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import { isWithinAllowedServiceArea } from "../utils/serviceArea";
import "leaflet/dist/leaflet.css";

const darEsSalaamCenter = [-6.7924, 39.2083];
const nearbyRadiusKm = 15;
const nearbyRefreshIntervalMs = 10000;
const driverMarkerStyles = {
  GARI_KUBWA: { label: "G", color: "#f97316" },
  KIRIKUU: { label: "K", color: "#38bdf8" },
  TOYO: { label: "T", color: "#34d399" },
  TOYO_NDOGO_UMEME: { label: "E", color: "#a78bfa" },
};

const driverMarkerIcons = Object.fromEntries(
  Object.entries(driverMarkerStyles).map(([vehicleType, { label, color }]) => [
    vehicleType,
    L.divIcon({
      className: "!border-0 !bg-transparent",
      html: `<span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border:3px solid #111827;border-radius:50%;background:${color};color:#111827;font-size:13px;font-weight:800;box-shadow:0 2px 8px #0008">${label}</span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    }),
  ]),
);

function distanceKm(first, second) {
  const [latitude1, longitude1] = first;
  const [latitude2, longitude2] = second;
  const latitudeDelta = ((latitude2 - latitude1) * Math.PI) / 180;
  const longitudeDelta = ((longitude2 - longitude1) * Math.PI) / 180;
  const firstLatitude = (latitude1 * Math.PI) / 180;
  const secondLatitude = (latitude2 * Math.PI) / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function MapFocus({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 17);
      return;
    }

    map.setView(darEsSalaamCenter, 13);
  }, [map, position]);

  return null;
}

function InvalidateMapSize() {
  const map = useMap();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    const timeoutId = window.setTimeout(() => map.invalidateSize({ pan: false }), 200);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [map]);

  return null;
}

function CustomerLiveMap() {
  const { t } = useTranslation();
  const [position, setPosition] = useState(null);
  const [positionAccuracy, setPositionAccuracy] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [nearbyDriversStatus, setNearbyDriversStatus] = useState("loading");
  const [locationStatus, setLocationStatus] = useState(() =>
    typeof navigator !== "undefined" && navigator.geolocation ? "locating" : "unsupported",
  );

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return undefined;
    let isActive = true;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude);
        const longitude = Number(coords.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          if (isActive) setLocationStatus("unavailable");
          return;
        }

        const accuracy = Number(coords.accuracy);
        if (isActive) {
          setPosition([latitude, longitude]);
          setPositionAccuracy(Number.isFinite(accuracy) ? accuracy : null);
          setLocationStatus(Number.isFinite(accuracy) && accuracy <= 100 ? "live" : "approximate");
        }
      },
      (error) => {
        const status = error.code === 1
          ? "denied"
          : error.code === 3
            ? "timeout"
            : "unavailable";
        if (isActive) setLocationStatus(status);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!position) return undefined;

    let isActive = true;
    let inFlight = false;
    const controller = new AbortController();
    const loadNearbyDrivers = async () => {
      if (inFlight) return;
      inFlight = true;
      setNearbyDriversStatus((status) => status === "ready" ? status : "loading");
      try {
        const response = await api.get("/drivers/nearby", {
          params: {
            latitude: position[0],
            longitude: position[1],
            radiusKm: nearbyRadiusKm,
          },
          signal: controller.signal,
        });
        if (!Array.isArray(response.data)) throw new Error("Invalid nearby drivers response");

        const drivers = response.data.filter((driver) => {
          const latitude = Number(driver.latitude);
          const longitude = Number(driver.longitude);
          const coords = [latitude, longitude];
          return Number.isFinite(latitude)
            && Number.isFinite(longitude)
            && isWithinAllowedServiceArea(coords)
            && Array.isArray(driver.vehicleTypes)
            && driver.vehicleTypes.some((type) => Object.hasOwn(driverMarkerStyles, type))
            && distanceKm(position, coords) <= nearbyRadiusKm;
        });
        if (isActive) {
          setNearbyDrivers(drivers);
          setNearbyDriversStatus("ready");
        }
      } catch {
        if (isActive && !controller.signal.aborted) setNearbyDriversStatus("error");
      } finally {
        inFlight = false;
      }
    };

    loadNearbyDrivers();
    const intervalId = window.setInterval(loadNearbyDrivers, nearbyRefreshIntervalMs);
    return () => {
      isActive = false;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [position]);

  return (
    <>
      <MapContainer
        center={darEsSalaamCenter}
        zoom={13}
        maxZoom={18}
        scrollWheelZoom
        className="z-0 h-[400px] min-h-[400px] w-full bg-zinc-900 lg:h-[500px] lg:min-h-[500px]"
        style={{ height: "100%", minHeight: "400px" }}
        aria-label={t("dashboard_map_title")}
      >
        <MapFocus position={position} />
        <InvalidateMapSize />
        <TileLayer
          attribution={t("map_attribution")}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position ? (
          <CircleMarker
            center={position}
            radius={8}
            pathOptions={{ color: "#111111", weight: 3, fillColor: "#f58b36", fillOpacity: 1 }}
          >
            <Popup>{t("dashboard_location_you")}</Popup>
          </CircleMarker>
        ) : (
          <CircleMarker
            center={darEsSalaamCenter}
            radius={8}
            pathOptions={{ color: "#111111", weight: 3, fillColor: "#f58b36", fillOpacity: 1 }}
          >
            <Popup>{t("dashboard_map_city")}</Popup>
          </CircleMarker>
        )}
        {nearbyDrivers.map((driver) => {
          const coords = [Number(driver.latitude), Number(driver.longitude)];
          const primaryVehicleType = driver.vehicleTypes.find(
            (type) => Object.hasOwn(driverMarkerStyles, type),
          );
          const vehicleLabels = driver.vehicleTypes
            .filter((type) => Object.hasOwn(driverMarkerStyles, type))
            .map((type) => t(`service_${type.toLowerCase()}`))
            .join(" · ");

          return (
            <Marker
              key={driver.driverId}
              position={coords}
              icon={driverMarkerIcons[primaryVehicleType]}
            >
              <Popup>
                <strong>{vehicleLabels}</strong>
                <br />
                {t("nearby_driver_available")}
                <br />
                {t("nearby_driver_distance", {
                  distance: distanceKm(position, coords).toFixed(1),
                })}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <span className="pointer-events-none absolute left-4 top-4 z-[400] inline-flex items-center gap-2 rounded-full border border-white/15 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
        <span className={`h-2 w-2 rounded-full ${locationStatus === "live" ? "animate-pulse bg-sky-400" : "bg-amber-300"}`} />
        {t(`dashboard_location_${locationStatus}`)}
      </span>
      {position && (
        <span
          role="status"
          className="pointer-events-none absolute right-4 top-4 z-[400] rounded-full border border-white/15 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur"
        >
          {nearbyDriversStatus === "ready" && nearbyDrivers.length === 0
            ? t("nearby_drivers_empty")
            : t(`nearby_drivers_${nearbyDriversStatus}`, { count: nearbyDrivers.length })}
        </span>
      )}
      {locationStatus !== "live" && locationStatus !== "locating" && (
        <p role="status" className="absolute bottom-4 left-4 right-4 z-[400] rounded-lg border border-white/10 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-300 shadow-lg">
          {locationStatus === "approximate"
            ? t("dashboard_location_approximate_hint", {
              accuracy: positionAccuracy == null ? "—" : Math.round(positionAccuracy),
            })
            : t(`dashboard_location_${locationStatus}_hint`)}
        </p>
      )}
    </>
  );
}

export default CustomerLiveMap;
