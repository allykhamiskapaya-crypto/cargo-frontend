import { useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

function MobileNavigationDrawer({
  id,
  open,
  onClose,
  brandTo,
  brandLogo,
  logoAlt,
  tagline,
  closeLabel,
  navigationLabel,
  headerActions,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div
      className={`fixed inset-0 z-[60] md:hidden ${
        open ? "visible" : "invisible pointer-events-none delay-300"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={closeLabel}
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={navigationLabel}
        className={`absolute inset-y-0 right-0 flex h-[100dvh] w-[min(88vw,24rem)] max-w-full flex-col overflow-hidden border-l border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/50 backdrop-blur-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="shrink-0 border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              to={brandTo}
              onClick={onClose}
              className="flex min-w-0 items-center gap-3"
            >
              <img
                src={brandLogo}
                alt={logoAlt}
                className="h-11 w-11 shrink-0 rounded-xl bg-white p-0.5 object-contain shadow-lg shadow-black/20"
              />
              <span className="min-w-0">
                <span className="block text-lg font-bold leading-tight text-amber-300">BEBA</span>
                <span className="block max-w-56 truncate text-xs leading-tight text-zinc-400">{tagline}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:border-amber-300/50 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {headerActions && <div className="mt-4">{headerActions}</div>}
        </div>
        <nav
          aria-label={navigationLabel}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        >
          {children}
        </nav>
      </aside>
    </div>
  );
}

export default MobileNavigationDrawer;
