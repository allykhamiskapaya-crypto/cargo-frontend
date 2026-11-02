import { Navigate, Outlet } from "react-router-dom";
import Navbar from "./Navbar";

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
      <Outlet />
    </div>
  );
}

export default AuthenticatedLayout;
