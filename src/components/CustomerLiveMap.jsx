import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import { isWithinAllowedServiceArea } from "../utils/serviceArea";
import { startVisibleInterval } from "../utils/startVisibleInterval";
import "leaflet/dist/leaflet.css";

const darEsSalaamCenter = [-6.7924, 39.2083];
const nearbyRefreshIntervalMs = 10000;
const highAccuracyLocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};
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

function MapFocus({ position, driverPositions, routeCoordinates }) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates) {
      map.fitBounds(
        L.latLngBounds([routeCoordinates.pickup, routeCoordinates.dropoff]),
        { padding: [40, 40], maxZoom: 15 },
      );
      return;
    }

    if (position) {
      if (driverPositions.length > 0) {
        map.fitBounds(L.latLngBounds([position, ...driverPositions]), {
          padding: [36, 36],
          maxZoom: 17,
        });
        return;
      }

      map.setView(position, 17);
      return;
    }

    map.setView(darEsSalaamCenter, 13);
  }, [driverPositions, map, position, routeCoordinates]);

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

function CustomerLiveMap({ routeCoordinates = null, onAvailabilityChange }) {
  const { t } = useTranslation();
  const [position, setPosition] = useState(null);
  const [positionAccuracy, setPositionAccuracy] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [nearbyDriversStatus, setNearbyDriversStatus] = useState("loading");
  const [locationRetryCount, setLocationRetryCount] = useState(0);
  const [locationStatus, setLocationStatus] = useState(() =>
    typeof navigator !== "undefined" && navigator.geolocation ? "locating" : "unsupported",
  );
  const driverPositions = useMemo(
    () => nearbyDrivers.map((driver) => [Number(driver.latitude), Number(driver.longitude)]),
    [nearbyDrivers],
  );
  const availableVehicleCounts = useMemo(() => {
    const counts = Object.fromEntries(
      Object.keys(driverMarkerStyles).map((vehicleType) => [vehicleType, 0]),
    );
    nearbyDrivers.forEach((driver) => {
      driver.vehicleTypes.forEach((vehicleType) => {
        if (Object.hasOwn(counts, vehicleType)) counts[vehicleType] += 1;
      });
    });
    return counts;
  }, [nearbyDrivers]);
  const availabilityStatus = nearbyDriversStatus === "error"
    ? "error"
    : nearbyDriversStatus === "ready"
      ? "ready"
      : ["locating", "live", "approximate"].includes(locationStatus) ? "loading" : "location";
  const hasPosition = Boolean(position);
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    onAvailabilityChange?.({
      counts: availableVehicleCounts,
      status: availabilityStatus,
    });
  }, [availabilityStatus, availableVehicleCounts, onAvailabilityChange]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return undefined;
    let isActive = true;
    let watchId = null;

    const updatePosition = ({ coords }) => {
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
    };

    const handleLocationError = (error) => {
      const status = error.code === 1
        ? "denied"
        : error.code === 3
          ? "timeout"
          : "unavailable";
      if (isActive) setLocationStatus(status);
    };

    const startHighAccuracyWatch = () => {
      if (!isActive || document.hidden || watchId !== null) return;
      watchId = navigator.geolocation.watchPosition(
        updatePosition,
        handleLocationError,
        highAccuracyLocationOptions,
      );
    };
    const stopHighAccuracyWatch = () => {
      if (watchId === null) return;
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    };
    const handleVisibilityChange = () => {
      if (document.hidden) stopHighAccuracyWatch();
      else startHighAccuracyWatch();
    };

    navigator.geolocation.getCurrentPosition(
      (currentPosition) => {
        updatePosition(currentPosition);
        startHighAccuracyWatch();
      },
      (error) => {
        handleLocationError(error);
        if (error.code !== 1) startHighAccuracyWatch();
      },
      highAccuracyLocationOptions,
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      stopHighAccuracyWatch();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [locationRetryCount]);

  useEffect(() => {
    if (!hasPosition) return undefined;

    let isActive = true;
    const controller = new AbortController();
    const loadNearbyDrivers = async () => {
      const currentPosition = positionRef.current;
      if (!currentPosition) return;
      setNearbyDriversStatus((status) => status === "ready" ? status : "loading");
      try {
        const response = await api.get("/drivers/nearby", {
          params: {
            latitude: currentPosition[0],
            longitude: currentPosition[1],
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
            && driver.vehicleTypes.some((type) => Object.hasOwn(driverMarkerStyles, type));
        });
        if (isActive) {
          setNearbyDrivers(drivers);
          setNearbyDriversStatus("ready");
        }
      } catch {
        if (isActive && !controller.signal.aborted) setNearbyDriversStatus("error");
      }
    };

    const stopPolling = startVisibleInterval(loadNearbyDrivers, nearbyRefreshIntervalMs);
    return () => {
      isActive = false;
      controller.abort();
      stopPolling();
    };
  }, [hasPosition]);

  return (
    <>
      <MapContainer
        center={darEsSalaamCenter}
        zoom={13}
        maxZoom={18}
        scrollWheelZoom
        className="z-0 h-[300px] min-h-[300px] w-full bg-zinc-900 sm:h-[400px] sm:min-h-[400px] lg:h-[500px] lg:min-h-[500px]"
        aria-label={t("dashboard_map_title")}
      >
        <MapFocus
          position={position}
          driverPositions={driverPositions}
          routeCoordinates={routeCoordinates}
        />
        <InvalidateMapSize />
        <TileLayer
          attribution={t("map_attribution")}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position && (
          <CircleMarker
            center={position}
            radius={8}
            pathOptions={{ color: "#111111", weight: 3, fillColor: "#f58b36", fillOpacity: 1 }}
          >
            <Popup>{t("dashboard_location_you")}</Popup>
          </CircleMarker>
        )}
        {routeCoordinates && (
          <>
            <Polyline
              positions={[routeCoordinates.pickup, routeCoordinates.dropoff]}
              pathOptions={{
                color: "#f59e0b",
                weight: 5,
                opacity: 0.9,
                dashArray: "8 10",
              }}
            />
            <CircleMarker
              center={routeCoordinates.pickup}
              radius={8}
              pathOptions={{ color: "#111111", weight: 3, fillColor: "#f59e0b", fillOpacity: 1 }}
            >
              <Popup>{t("origin")}</Popup>
            </CircleMarker>
            <CircleMarker
              center={routeCoordinates.dropoff}
              radius={8}
              pathOptions={{ color: "#111111", weight: 3, fillColor: "#fb923c", fillOpacity: 1 }}
            >
              <Popup>{t("destination")}</Popup>
            </CircleMarker>
          </>
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
      <span className="pointer-events-none absolute left-2 top-2 z-[400] inline-flex max-w-[calc(100%_-_1rem)] items-center gap-2 break-words rounded-full border border-white/15 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur sm:left-4 sm:top-4">
        <span className={`h-2 w-2 rounded-full ${locationStatus === "live" ? "animate-pulse bg-sky-400" : "bg-amber-300"}`} />
        {t(`dashboard_location_${locationStatus}`)}
      </span>
      {position && (
        <span
          role="status"
          className="pointer-events-none absolute left-2 top-12 z-[400] max-w-[calc(100%_-_1rem)] break-words rounded-full border border-white/15 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur sm:left-auto sm:right-4 sm:top-4"
        >
          {nearbyDriversStatus === "ready" && nearbyDrivers.length === 0
            ? t("nearby_drivers_empty")
            : t(`nearby_drivers_${nearbyDriversStatus}`, { count: nearbyDrivers.length })}
        </span>
      )}
      {locationStatus !== "live" && locationStatus !== "locating" && (
        <div role="status" className="absolute bottom-2 left-2 right-2 z-[400] flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-300 shadow-lg sm:bottom-4 sm:left-4 sm:right-4">
          <span className="min-w-0 break-words leading-5">
            {locationStatus === "approximate"
              ? t("dashboard_location_approximate_hint", {
                accuracy: positionAccuracy == null ? "—" : Math.round(positionAccuracy),
              })
              : t(`dashboard_location_${locationStatus}_hint`)}
          </span>
          <button
            type="button"
            onClick={() => {
              setLocationStatus("locating");
              setLocationRetryCount((count) => count + 1);
            }}
            className="min-h-11 shrink-0 rounded-md bg-amber-300 px-3 py-2 font-semibold text-zinc-950 hover:bg-amber-200"
          >
            {t("dashboard_location_retry")}
          </button>
        </div>
      )}
    </>
  );
}

export default CustomerLiveMap;
