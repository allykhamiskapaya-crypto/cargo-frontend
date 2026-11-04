import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import VehicleTypeSelector from "../components/VehicleTypeSelector";
import { isValidUpload } from "../utils/uploadValidation";

const vehiclePhotoFields = [
  { name: "frontPhoto", label: "vehicle_front_photo" },
  { name: "rearPhoto", label: "vehicle_back_photo" },
  { name: "rightPhoto", label: "vehicle_right_photo" },
  { name: "leftPhoto", label: "vehicle_left_photo" },
];
const vehiclePhotoTypes = ["image/jpeg", "image/png", "image/webp"];

function VehicleRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const userRole = user?.role;

  const [formData, setFormData] = useState({
    plateNumber: "",
    vehicleType: "",
    capacityKg: "",
  });
  const [vehiclePhotos, setVehiclePhotos] = useState({});
  const [myVehicles, setMyVehicles] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshVehicles = async () => {
    try {
      const response = await api.get(`/vehicles/driver/${userId}`);
      setMyVehicles(response.data);
    } catch {
      setError(t("backend_error"));
    }
  };

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }
    if (userRole !== "DRIVER") {
      navigate("/dashboard");
      return;
    }

    let isActive = true;
    const loadVehicles = async () => {
      try {
        const response = await api.get(`/vehicles/driver/${userId}`);
        if (isActive) setMyVehicles(response.data);
      } catch {
        if (isActive) setError(t("backend_error"));
      }
    };

    loadVehicles();
    return () => {
      isActive = false;
    };
  }, [navigate, t, userId, userRole]);

  if (!userId || userRole !== "DRIVER") return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!formData.vehicleType) {
      setError(t("vehicle_type_required"));
      return;
    }
    if (vehiclePhotoFields.some(({ name }) => !isValidUpload(vehiclePhotos[name], vehiclePhotoTypes))) {
      const hasOversizedPhoto = vehiclePhotoFields.some(({ name }) => vehiclePhotos[name]?.size > 1_000_000);
      setError(hasOversizedPhoto ? t("driver_photo_too_large") : t("driver_invalid_photo"));
      return;
    }
    setLoading(true);

    try {
      const payload = {
        driverId: user.id,
        plateNumber: formData.plateNumber,
        vehicleType: formData.vehicleType,
        capacityKg: parseFloat(formData.capacityKg),
      };
      const body = new FormData();
      body.append("vehicle", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      vehiclePhotoFields.forEach(({ name }) => body.append(name, vehiclePhotos[name]));
      await api.post("/vehicles/onboard", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(t("vehicle_success"));
      setFormData({ plateNumber: "", vehicleType: "", capacityKg: "" });
      setVehiclePhotos({});
      refreshVehicles();
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data);
      } else {
        setError(t("backend_error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition";

  return (
    <div className="relative min-h-screen text-white">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-12">
        <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-950/80 p-5 backdrop-blur-md sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-1">{t("vehicle_title")}</h2>
          <p className="text-zinc-500 text-sm mb-6">{t("vehicle_subtitle")}</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 mb-5">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-2">
                {t("plate_number")}
              </label>
              <input
                type="text"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleChange}
                required
                placeholder={t("vehicle_plate_placeholder")}
                className={inputClass}
              />
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-zinc-400">
                {t("vehicle_type")}
              </span>
              <VehicleTypeSelector
                value={formData.vehicleType}
                onChange={(vehicleType) => setFormData((current) => ({ ...current, vehicleType }))}
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-2">
                {t("capacity_kg")}
              </label>
              <input
                type="number"
                step="0.01"
                name="capacityKg"
                value={formData.capacityKg}
                onChange={handleChange}
                required
                placeholder={t("vehicle_capacity_placeholder")}
                className={inputClass}
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium text-zinc-400">
                {t("vehicle_photos_title")}
              </legend>
              {vehiclePhotoFields.map(({ name, label }) => (
                <label key={name} className="block text-zinc-400 text-sm font-medium">
                  <span className="mb-2 block">{t(label)}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(event) => setVehiclePhotos((current) => ({
                      ...current,
                      [name]: event.target.files?.[0] || null,
                    }))}
                    className={inputClass}
                  />
                  {vehiclePhotos[name] && (
                    <span className="mt-1 block text-xs text-zinc-500">{vehiclePhotos[name].name}</span>
                  )}
                </label>
              ))}
              <p className="text-xs text-zinc-500">{t("upload_photo_requirements")}</p>
            </fieldset>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold rounded-lg py-3 transition mt-2"
            >
              {loading ? t("vehicle_loading") : t("vehicle_submit")}
            </button>
          </form>
        </div>

        {myVehicles.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">{t("my_vehicles")}</h3>
            <div className="space-y-3">
              {myVehicles.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-800 px-4 py-3">
                  <div>
                    <span className="text-white font-medium">{v.plateNumber}</span>
                    <span className="text-zinc-500 text-sm ml-3">{v.vehicleType}</span>
                  </div>
                  <span className="text-zinc-400 text-sm">{v.capacityKg} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VehicleRegister;