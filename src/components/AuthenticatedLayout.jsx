import { Navigate, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import MobileBottomNav from "./MobileBottomNav";

function AuthenticatedLayout() {
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  const token = localStorage.getItem("token");
  if (!user || !token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen text-white">
      <Navbar user={user} />
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </div>
      <MobileBottomNav user={user} />
    </div>
  );
}

export default AuthenticatedLayout;
