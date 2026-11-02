import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import "leaflet/dist/leaflet.css";

const defaultCenter = [-6.8, 39.2];
const geocodingCache = new Map();
const routeCache = new Map();

const createMapIcon = (label, color) => L.divIcon({
  className: "!border-0 !bg-transparent",
  html: `<span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border:3px solid #111827;border-radius:50%;background:${color};color:#111827;font-size:13px;font-weight:800;box-shadow:0 2px 8px #0008">${label}</span>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const originIcon = createMapIcon("O", "#fbbf24");
const destinationIcon = createMapIcon("D", "#fbbf24");
const driverIcon = createMapIcon("V", "#f97316");

async function geocode(place) {
  const cacheKey = place.trim().toLowerCase();
  if (geocodingCache.has(cacheKey)) return geocodingCache.get(cacheKey);

  const response = await fetch(
    `https://photon.komoot.io/api/?limit=1&lat=-6.8&lon=39.2&q=${encodeURIComponent(`${place}, Tanzania`)}`,
  );
  if (!response.ok) throw new Error("Geocoding request failed");
  const feature = (await response.json()).features?.[0];
  if (!feature) throw new Error("Location not found");

  const [longitude, latitude] = feature.geometry.coordinates;
  const coordinates = [latitude, longitude];
  geocodingCache.set(cacheKey, coordinates);
  return coordinates;
}

function FitRouteBounds({ points }) {
  const map = useMap();
  const originLatitude = points[0]?.[0];
  const originLongitude = points[0]?.[1];
  const destinationLatitude = points[1]?.[0];
  const destinationLongitude = points[1]?.[1];

  useEffect(() => {
    if (originLatitude != null && destinationLatitude != null) {
      map.fitBounds(
        [[originLatitude, originLongitude], [destinationLatitude, destinationLongitude]],
        { padding: [36, 36], maxZoom: 10 },
      );
    }
  }, [map, originLatitude, originLongitude, destinationLatitude, destinationLongitude]);

  return null;
}

function LiveShipmentMap({ shipment }) {
  const { t } = useTranslation();
  const [routePoints, setRoutePoints] = useState([]);
  const [driverPosition, setDriverPosition] = useState(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeUnavailable, setRouteUnavailable] = useState(false);
  const shipmentId = shipment.id;
  const isTrackingDriver = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(shipment.status);

  useEffect(() => {
    let isActive = true;
    const cacheKey = `${shipment.origin.trim().toLowerCase()}|${shipment.destination.trim().toLowerCase()}`;

    const loadRoute = async () => {
      setRouteLoading(true);
      setRouteUnavailable(false);
      try {
        const cachedRoute = routeCache.get(cacheKey);
        if (cachedRoute) {
          if (isActive) setRoutePoints(cachedRoute);
          return;
        }

        const [origin, destination] = await Promise.all([
          geocode(shipment.origin),
          geocode(shipment.destination),
        ]);
        const routeResponse = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`,
        );
        if (!routeResponse.ok) throw new Error("Route request failed");
        const route = (await routeResponse.json()).routes?.[0];
        if (!route) throw new Error("Route not found");

        const points = route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]);
        routeCache.set(cacheKey, points);
        if (isActive) setRoutePoints(points);
      } catch {
        if (isActive) {
          setRoutePoints([]);
          setRouteUnavailable(true);
        }
      } finally {
        if (isActive) setRouteLoading(false);
      }
    };

    loadRoute();
    return () => { isActive = false; };
  }, [shipment.destination, shipment.origin]);

  useEffect(() => {
    if (!isTrackingDriver) return undefined;

    let isActive = true;
    const loadPosition = async () => {
      try {
        const response = await api.get(`/shipments/${shipmentId}/location`);
        const latitude = Number(response.data?.driverLatitude);
        const longitude = Number(response.data?.driverLongitude);
        if (isActive && Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setDriverPosition({ coordinates: [latitude, longitude], timestamp: response.data.timestamp });
        } else if (isActive) {
          setDriverPosition(null);
        }
      } catch {
        if (isActive) setDriverPosition(null);
      }
    };

    loadPosition();
    const intervalId = window.setInterval(loadPosition, 3000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [isTrackingDriver, shipmentId]);

  return (
    <section className="overflow-hidden rounded-lg border border-amber-400/25 bg-neutral-950" aria-label={t("shipment_map_title")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{t("shipment_map_title")}</h3>
          <p className="mt-1 text-xs text-zinc-400">
            <span className="text-amber-300">{t("shipment_map_origin")}</span> {shipment.origin}
            <span className="mx-2 text-zinc-600">{t("shipment_map_to")}</span>
            <span className="text-amber-300">{t("shipment_map_destination")}</span> {shipment.destination}
          </p>
        </div>
        {isTrackingDriver && (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-medium text-amber-200">
            {driverPosition ? t("shipment_map_live") : t("shipment_map_waiting")}
          </span>
        )}
      </div>

      {routeLoading && <p className="px-4 py-2 text-xs text-zinc-400">{t("shipment_map_loading")}</p>}
      {routeUnavailable && <p className="px-4 py-2 text-xs text-amber-200">{t("shipment_map_route_unavailable")}</p>}

      <MapContainer
        center={defaultCenter}
        zoom={6}
        scrollWheelZoom={false}
        className="z-0 h-[320px] w-full bg-neutral-900 sm:h-[380px]"
        aria-label={t("shipment_map_title")}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePoints.length > 1 && (
          <>
            <FitRouteBounds points={[routePoints[0], routePoints[routePoints.length - 1]]} />
            <Polyline positions={routePoints} pathOptions={{ color: "#f59e0b", weight: 5, opacity: 0.9 }} />
            <Marker position={routePoints[0]} icon={originIcon}>
              <Popup>{t("shipment_map_origin")}: {shipment.origin}</Popup>
            </Marker>
            <Marker position={routePoints[routePoints.length - 1]} icon={destinationIcon}>
              <Popup>{t("shipment_map_destination")}: {shipment.destination}</Popup>
            </Marker>
          </>
        )}
        {isTrackingDriver && driverPosition && (
          <Marker position={driverPosition.coordinates} icon={driverIcon}>
            <Popup>
              {t("shipment_map_driver")}
              {driverPosition.timestamp && (
                <div>{new Date(driverPosition.timestamp).toLocaleString()}</div>
              )}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </section>
  );
}

export default LiveShipmentMap;