const SERVICE_AREAS = [
  { minLatitude: -7.15, maxLatitude: -6.30, minLongitude: 38.70, maxLongitude: 39.75 },
  { minLatitude: -8.75, maxLatitude: -5.35, minLongitude: 37.45, maxLongitude: 40.05 },
];

export function isWithinAllowedServiceArea([latitude, longitude]) {
  return SERVICE_AREAS.some((area) => (
    latitude >= area.minLatitude
    && latitude <= area.maxLatitude
    && longitude >= area.minLongitude
    && longitude <= area.maxLongitude
  ));
}