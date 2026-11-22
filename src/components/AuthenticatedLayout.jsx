import { Navigate, Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import MobileBottomNav from "./MobileBottomNav";
import ScrollToTopButton from "./ScrollToTopButton";

function AuthenticatedLayout() {
  const location = useLocation();
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  const token = localStorage.getItem("token");
  if (!user || !token) return <Navigate to="/login" replace />;

  const role = String(user.role || "").replace(/^ROLE_/, "");
  const isCustomerHome = role === "CUSTOMER" && location.pathname === "/dashboard";

  return (
    <div className="min-h-screen text-white">
      <Navbar user={user} />
      <div className={isCustomerHome ? "pb-0" : "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0"}>
        <Outlet />
      </div>
      {!isCustomerHome && <MobileBottomNav user={user} />}
      <ScrollToTopButton
        aboveBottomNav
        aboveActionBar={location.pathname === "/booking"}
      />
    </div>
  );
}

export default AuthenticatedLayout;
