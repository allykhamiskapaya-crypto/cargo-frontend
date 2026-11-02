import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import Tracking from "./pages/Tracking";
import MyShipments from "./pages/MyShipments";
import VehicleRegister from "./pages/VehicleRegister";
import Payment from "./pages/Payment";
import DriverDashboard from "./pages/DriverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AuthenticatedLayout from "./components/AuthenticatedLayout";

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;