function Wheel({ cx, cy, r }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#18181b" stroke="#52525b" strokeWidth={r * 0.18} />
      <circle cx={cx} cy={cy} r={r * 0.56} fill="#a1a1aa" stroke="#e4e4e7" strokeWidth={r * 0.1} />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#3f3f46" />
    </g>
  );
}

function ServiceVehicleIcon({ type, size = 30, variant = "icon" }) {
  if (variant === "illustration") {
    const illustrationProps = {
      "aria-hidden": true,
      className: "block max-w-full",
      height: size * 0.62,
      viewBox: "0 0 180 112",
      width: size,
    };

    if (type === "GARI_KUBWA") {
      return (
        <svg {...illustrationProps}>
          <ellipse cx="88" cy="94" rx="72" ry="6" fill="#09090b" opacity="0.55" />
          <path d="M16 28a5 5 0 0 1 5-5h82v48H16z" fill="#a1a1aa" stroke="#e4e4e7" strokeWidth="2" />
          <path d="M21 27h77v8H21z" fill="#f4f4f5" opacity="0.5" />
          <path d="M27 37v28m10-28v28m10-28v28m10-28v28m10-28v28m10-28v28m10-28v28m10-28v28" stroke="#71717a" strokeWidth="1.5" opacity="0.65" />
          <path d="M103 42h17l14 11 8 2 7 11v9h-47z" fill="currentColor" stroke="#27272a" strokeWidth="2" />
          <path d="M109 45h10l10 9h-20z" fill="#18181b" stroke="#d4d4d8" strokeWidth="1.5" />
          <path d="M131 57h9l5 8h-14z" fill="#27272a" />
          <path d="M105 64h12v10h-12z" fill="#ea580c" opacity="0.75" />
          <path d="M149 66h5v5h-5z" fill="#fde68a" />
          <path d="M18 69h136v5H18z" fill="#52525b" />
          <path d="M25 73h71" stroke="#f4f4f5" strokeWidth="1.5" opacity="0.6" />
          <Wheel cx={44} cy={78} r={11} />
          <Wheel cx={91} cy={78} r={11} />
          <Wheel cx={136} cy={78} r={11} />
        </svg>
      );
    }

    if (type === "KIRIKUU") {
      return (
        <svg {...illustrationProps}>
          <ellipse cx="88" cy="94" rx="62" ry="6" fill="#09090b" opacity="0.55" />
          <path d="M22 54h48v17H22z" fill="#3f3f46" stroke="#a1a1aa" strokeWidth="2" />
          <path d="M25 51v-7h42v10" fill="none" stroke="#d4d4d8" strokeWidth="2.5" />
          <path d="M31 46h13v9H31zm17 0h14v9H48z" fill="#a1a1aa" stroke="#71717a" strokeWidth="1.5" />
          <path d="M69 51h10l11-16h25l12 16h15l13 13v9H69z" fill="currentColor" stroke="#27272a" strokeWidth="2" />
          <path d="M84 49l9-12h20l9 12z" fill="#18181b" stroke="#d4d4d8" strokeWidth="1.5" />
          <path d="M94 39h10v9H88z" fill="#27272a" />
          <path d="M120 54h17l9 9h-26z" fill="#3f3f46" />
          <path d="M76 58h9v12h-9z" fill="#27272a" />
          <path d="M149 64h6v5h-6z" fill="#fde68a" />
          <path d="M23 70h132v5H23z" fill="#52525b" />
          <Wheel cx={49} cy={78} r={11} />
          <Wheel cx={131} cy={78} r={11} />
        </svg>
      );
    }

    if (type === "TOYO") {
      return (
        <svg {...illustrationProps}>
          <ellipse cx="88" cy="94" rx="66" ry="6" fill="#09090b" opacity="0.55" />
          <path d="M15 45h43v27H15z" fill="#3f3f46" stroke="#a1a1aa" strokeWidth="2" />
          <path d="M19 48h35v6H19zm0 10h35v10H19z" fill="#71717a" />
          <path d="M23 48v20m9-20v20m9-20v20m9-20v20" stroke="#a1a1aa" strokeWidth="1.5" />
          <path d="M59 66h65v8H59z" fill="currentColor" stroke="#27272a" strokeWidth="2" />
          <path d="M67 28h39v6H67z" fill="currentColor" stroke="#27272a" strokeWidth="2" />
          <path d="M70 35v26m34-26v26" stroke="#a1a1aa" strokeWidth="3" />
          <path d="M75 39h24l3 20H72z" fill="#18181b" stroke="#d4d4d8" strokeWidth="1.5" />
          <path d="M78 42h18l2 13H76z" fill="#334155" />
          <path d="M105 44l16 16-8 9" fill="none" stroke="#d4d4d8" strokeWidth="3" strokeLinecap="round" />
          <path d="M121 64l13 12" stroke="#52525b" strokeWidth="4" strokeLinecap="round" />
          <path d="M121 65a18 18 0 0 1 27 9h-24z" fill="currentColor" stroke="#27272a" strokeWidth="2" />
          <path d="M15 70h134v5H15z" fill="#52525b" />
          <Wheel cx={37} cy={79} r={10} />
          <Wheel cx={55} cy={79} r={10} />
          <Wheel cx={138} cy={82} r={9} />
        </svg>
      );
    }

    if (type === "TOYO_NDOGO_UMEME") {
      return (
        <svg {...illustrationProps}>
          <ellipse cx="88" cy="94" rx="63" ry="6" fill="#09090b" opacity="0.55" />
          <path d="M18 49h43v24H18z" fill="#3f3f46" stroke="#a1a1aa" strokeWidth="2" />
          <path d="M22 53h35v16H22z" fill="#71717a" />
          <path d="M27 54v14m9-14v14m9-14v14" stroke="#a1a1aa" strokeWidth="1.5" />
          <path d="M60 67h68v7H60z" fill="currentColor" stroke="#27272a" strokeWidth="2" />
          <path d="M68 35q2-9 12-9h29q11 0 14 11l8 29H65z" fill="currentColor" stroke="#27272a" strokeWidth="2" />
          <path d="M81 31h25q8 0 10 8l3 12H76l1-12q0-8 4-8z" fill="#18181b" stroke="#d4d4d8" strokeWidth="1.5" />
          <path d="M83 34h21q6 0 8 5l2 9H80l1-9q0-4 2-5z" fill="#334155" />
          <path d="M75 54h17v11H75z" fill="#27272a" />
          <path d="m83 55-4 7h4l-2 6 8-9h-4l2-4z" fill="currentColor" stroke="#f4f4f5" strokeWidth="1.2" />
          <rect x="106" y="55" width="12" height="8" rx="2" fill="#18181b" stroke="#d4d4d8" strokeWidth="1" />
          <path d="M109 57h6m-6 3h6" stroke="#d4d4d8" strokeWidth="1" />
          <path d="M20 71h132v4H20z" fill="#52525b" />
          <Wheel cx={42} cy={79} r={10} />
          <Wheel cx={59} cy={79} r={10} />
          <Wheel cx={139} cy={81} r={9} />
        </svg>
      );
    }
  }

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
          <path d="m36 23-5 8h4l-2 6 8-10h-4l2-4z" fill="currentColor" strokeWidth="1" />
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
