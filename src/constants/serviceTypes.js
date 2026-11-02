import ServiceVehicleIcon from "../components/ServiceVehicleIcon";

export const serviceTypes = [
  {
    id: "GARI_KUBWA",
    label: "service_gari_kubwa",
    description: "service_gari_kubwa_hint",
    Icon: ServiceVehicleIcon,
    color: "text-orange-300",
    background: "bg-orange-400/15",
  },
  {
    id: "KIRIKUU",
    label: "service_kirikuu",
    description: "service_kirikuu_hint",
    Icon: ServiceVehicleIcon,
    color: "text-sky-300",
    background: "bg-sky-400/15",
  },
  {
    id: "TOYO",
    label: "service_toyo",
    description: "service_toyo_hint",
    Icon: ServiceVehicleIcon,
    color: "text-emerald-300",
    background: "bg-emerald-400/15",
  },
  {
    id: "TOYO_NDOGO_UMEME",
    label: "service_toyo_ndogo_umeme",
    description: "service_toyo_ndogo_umeme_hint",
    Icon: ServiceVehicleIcon,
    color: "text-violet-300",
    background: "bg-violet-400/15",
  },
];

export const serviceTypeIds = serviceTypes.map(({ id }) => id);
