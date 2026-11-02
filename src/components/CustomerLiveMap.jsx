import { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { useTranslation } from "react-i18next";
import "leaflet/dist/leaflet.css";

const darEsSalaamCenter = [-6.7924, 39.2083];
const darEsSalaamBounds = [
  [-7.05, 38.95],
  [-6.55, 39.6],
];

function MapFocus({ position }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position || darEsSalaamCenter, position ? 16 : 13, {
      animate: true,
      duration: 1.2,
    });
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

function isInsideDarEsSalaam(latitude, longitude) {
  return latitude >= darEsSalaamBounds[0][0]
    && latitude <= darEsSalaamBounds[1][0]
    && longitude >= darEsSalaamBounds[0][1]
    && longitude <= darEsSalaamBounds[1][1];
}

function CustomerLiveMap() {
  const { t } = useTranslation();
  const [position, setPosition] = useState(null);
  const [locationStatus, setLocationStatus] = useState(() =>
    navigator.geolocation ? "locating" : "unsupported",
  );

  useEffect(() => {
    if (!navigator.geolocation) return undefined;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude);
        const longitude = Number(coords.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setLocationStatus("unavailable");
          return;
        }

        if (!isInsideDarEsSalaam(latitude, longitude)) {
          setPosition(null);
          setLocationStatus("outside");
          return;
        }

        setPosition({
          latitude,
          longitude,
          accuracy: coords.accuracy,
        });
        setLocationStatus("live");
      },
      (error) => {
        const status = error.code === 1
          ? "denied"
          : error.code === 3
            ? "timeout"
            : "unavailable";
        setLocationStatus(status);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      },
    );

    return undefined;
  }, []);

  const focusedPosition = useMemo(
    () => position ? [position.latitude, position.longitude] : null,
    [position],
  );

  return (
    <>
      <MapContainer
        center={darEsSalaamCenter}
        zoom={13}
        minZoom={11}
        maxZoom={18}
        maxBounds={darEsSalaamBounds}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className="z-0 h-[400px] min-h-[400px] w-full bg-zinc-900 lg:h-[500px] lg:min-h-[500px]"
        style={{ height: "100%", minHeight: "400px" }}
        aria-label={t("dashboard_map_title")}
      >
        <MapFocus position={focusedPosition} />
        <InvalidateMapSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position ? (
          <>
            <Circle
              center={focusedPosition}
              radius={Math.min(position.accuracy || 0, 300)}
              pathOptions={{ color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 0.12, weight: 1 }}
            />
            <CircleMarker
              center={focusedPosition}
              radius={9}
              pathOptions={{ color: "#082f49", weight: 3, fillColor: "#38bdf8", fillOpacity: 1 }}
            >
              <Popup>{t("dashboard_location_you")}</Popup>
            </CircleMarker>
          </>
        ) : (
          <CircleMarker
            center={darEsSalaamCenter}
            radius={8}
            pathOptions={{ color: "#18181b", weight: 3, fillColor: "#fbbf24", fillOpacity: 1 }}
          >
            <Popup>{t("dashboard_map_city")}</Popup>
          </CircleMarker>
        )}
      </MapContainer>
      <span className="pointer-events-none absolute left-4 top-4 z-[400] inline-flex items-center gap-2 rounded-full border border-white/15 bg-zinc-950/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
        <span className={`h-2 w-2 rounded-full ${locationStatus === "live" ? "animate-pulse bg-sky-400" : "bg-amber-300"}`} />
        {t(`dashboard_location_${locationStatus}`)}
      </span>
      {locationStatus !== "live" && locationStatus !== "locating" && (
        <p role="status" className="absolute bottom-4 left-4 right-4 z-[400] rounded-lg border border-white/10 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-300 shadow-lg">
          {t(`dashboard_location_${locationStatus}_hint`)}
        </p>
      )}
    </>
  );
}

export default CustomerLiveMap;
