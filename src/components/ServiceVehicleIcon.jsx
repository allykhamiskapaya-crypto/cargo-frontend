function ServiceVehicleIcon({ type, size = 30 }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2.4,
  };

  if (type === "SCHEDULE_AHEAD") {
    return (
      <svg aria-hidden="true" viewBox="0 0 48 48" width={size} height={size} {...shared}>
        <rect x="4" y="8" width="31" height="34" rx="4" />
        <path d="M4 18h31M12 4v9m15-9v9m-16 13h5m-5 7h5" />
        <circle cx="34" cy="34" r="10" fill="var(--service-icon-bg)" />
        <path d="M34 28v6l4 2" />
      </svg>
    );
  }

  if (type === "TOYO" || type === "TOYO_NDOGO_UMEME") {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 48" width={size} height={size} {...shared}>
        <circle cx="13" cy="38" r="5" />
        <circle cx="22" cy="38" r="5" />
        <circle cx="51" cy="38" r="5" />
        <path d="M8 31h14l6-10h15l7 9h7v8h-2M27 21v-9h16v9M26 26h17M22 31h28" />
        {type === "TOYO_NDOGO_UMEME" ? (
          <path
            d="m36 23-5 8h4l-2 6 8-10h-4l2-4z"
            fill="currentColor"
            strokeWidth="1"
          />
        ) : (
          <path d="M30 16h10" />
        )}
      </svg>
    );
  }

  if (type === "KIRIKUU") {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 48" width={size} height={size} {...shared}>
        <circle cx="17" cy="38" r="6" />
        <circle cx="48" cy="38" r="6" />
        <path d="M7 31h28V19h-8l-7 8H8zM35 25h13l8 7v6h-2M12 38h30m12 0h-1" />
        <path d="M10 30h10l7-8m12 5h9v-6h-9" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 64 48" width={size} height={size} {...shared}>
      <circle cx="15" cy="38" r="6" />
      <circle cx="43" cy="38" r="6" />
      <circle cx="55" cy="38" r="6" />
      <path d="M6 32h5V12h33v20h4M6 38h3m9 0h19m12 0h1m12 0h-1" />
      <path d="M14 16h26v12H14zM44 21h6l7 8h-13" />
      <path d="M18 20h18m-18 5h18" />
    </svg>
  );
}

export default ServiceVehicleIcon;
