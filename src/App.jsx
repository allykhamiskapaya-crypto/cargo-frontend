import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthenticatedLayout from "./components/AuthenticatedLayout";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Booking = lazy(() => import("./pages/Booking"));
const Tracking = lazy(() => import("./pages/Tracking"));
const MyShipments = lazy(() => import("./pages/MyShipments"));
const VehicleRegister = lazy(() => import("./pages/VehicleRegister"));
const Payment = lazy(() => import("./pages/Payment"));
const Receipt = lazy(() => import("./pages/Receipt"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

function PageLoading() {
  return (
    <main role="status" aria-label="Loading page" className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-7xl animate-pulse space-y-5">
        <div className="h-14 rounded-xl bg-white/10" />
        <div className="h-40 rounded-2xl bg-white/[0.06]" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-xl bg-white/[0.06]" />
          <div className="h-28 rounded-xl bg-white/[0.06]" />
          <div className="h-28 rounded-xl bg-white/[0.06]" />
        </div>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/tracking/:shipmentId" element={<Tracking />} />
            <Route path="/shipments" element={<MyShipments />} />
            <Route path="/vehicle" element={<VehicleRegister />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/receipt/:shipmentId" element={<Receipt />} />
            <Route path="/driver-dashboard" element={<DriverDashboard />} />
            <Route path="/driver-shipments" element={<DriverDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;