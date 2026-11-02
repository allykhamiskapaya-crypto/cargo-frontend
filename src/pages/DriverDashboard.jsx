import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Bell, CheckCircle2, Clock3, CreditCard, Mail, MapPin, MessageCircle, Navigation, Package, Phone, Route, Truck, UserRound, Wifi, X } from "lucide-react";
import api from "../api/axiosClient";
import VehicleTypeSelector from "../components/VehicleTypeSelector";
import { isValidUpload } from "../utils/uploadValidation";

const LiveShipmentMap = lazy(() => import("../components/LiveShipmentMap"));

const vehiclePhotoFields = [
  { name: "frontPhoto", label: "vehicle_front_photo" },
  { name: "rearPhoto", label: "vehicle_back_photo" },
  { name: "rightPhoto", label: "vehicle_right_photo" },
  { name: "leftPhoto", label: "vehicle_left_photo" },
];
const vehiclePhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const licenseDocumentTypes = ["application/pdf", ...vehiclePhotoTypes];
const SIMULATION_INTERVAL_MS = 12_000;
const simulationFallbackCoordinates = {
  origin: [-6.8123, 39.2789],
  destination: [-6.7123, 39.2234],
};
const simulationPlaceCoordinates = [
  { match: /upanga/i, coordinates: [-6.8123, 39.2789] },
  { match: /mbezi beach/i, coordinates: [-6.7123, 39.2234] },
  { match: /kibaha/i, coordinates: [-6.7667, 38.95] },
];

function getValidCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return null;
  const lat = Number(latitude);
  const lon = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lon) && lon >= -180 && lon <= 180
    ? [lat, lon] : null;
}

async function geocodeSimulationPlace(place, fallbackCoordinates) {
  if (typeof place !== "string" || !place.trim()) return fallbackCoordinates;
  const knownPlace = simulationPlaceCoordinates.find(({ match }) => match.test(place));
  if (knownPlace) return knownPlace.coordinates;

  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?limit=1&lat=-6.8&lon=39.2&q=${encodeURIComponent(`${place}, Tanzania`)}`,
    );
    if (!response.ok) return fallbackCoordinates;
    const coordinates = (await response.json())?.features?.[0]?.geometry?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const resolved = getValidCoordinates(coordinates[1], coordinates[0]);
      if (resolved) return resolved;
    }
  } catch {
    return fallbackCoordinates;
  }
  return fallbackCoordinates;
}

async function createSimulationPath(shipment) {
  const [origin, destination] = await Promise.all([
    Promise.resolve(getValidCoordinates(shipment.originLatitude, shipment.originLongitude))
      .then((coordinates) => coordinates || geocodeSimulationPlace(
        shipment.origin, simulationFallbackCoordinates.origin,
      )),
    Promise.resolve(getValidCoordinates(shipment.destinationLatitude, shipment.destinationLongitude))
      .then((coordinates) => coordinates || geocodeSimulationPlace(
        shipment.destination, simulationFallbackCoordinates.destination,
      )),
  ]);
  const segmentCount = 10;
  return Array.from({ length: segmentCount + 1 }, (_, index) => ({
    latitude: Number((origin[0] + ((destination[0] - origin[0]) * index) / segmentCount).toFixed(7)),
    longitude: Number((origin[1] + ((destination[1] - origin[1]) * index) / segmentCount).toFixed(7)),
  }));
}

function getMapsSearchUrl(address, latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const hasCoordinates = latitude != null && longitude != null
    && Number.isFinite(lat) && lat >= -90 && lat <= 90
    && Number.isFinite(lon) && lon >= -180 && lon <= 180;
  const query = hasCoordinates ? `${lat},${lon}` : address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || "")}`;
}

function getWhatsAppUrl(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const internationalNumber = digits.startsWith("0") ? `255${digits.slice(1)}` : digits;
  return `https://wa.me/${internationalNumber}`;
}

const statusOrder = [
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "PENDING",
];

const nextStatus = {
  ASSIGNED: { status: "PICKED_UP", label: "driver_mark_picked_up" },
  PICKED_UP: { status: "IN_TRANSIT", label: "driver_mark_in_transit" },
  IN_TRANSIT: { status: "DELIVERED", label: "driver_mark_delivered" },
};

const statusColors = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  ASSIGNED: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  PICKED_UP: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  IN_TRANSIT: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  DELIVERED: "bg-green-500/10 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/30",
};

function DriverDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  const userId = user?.id;
  const userRole = String(user?.role || "").replace(/^ROLE_/, "");
  const userFullName = user?.fullName || "";
  const userPhone = user?.phone || "";
  const seenOffersStorageKey = `driver-seen-offers-${userId}`;
  const [seenOfferIds, setSeenOfferIds] = useState(() => {
    try {
      const storedIds = JSON.parse(localStorage.getItem(seenOffersStorageKey) || "[]");
      return Array.isArray(storedIds) ? storedIds : [];
    } catch {
      return [];
    }
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState(null);
  const previousOfferIds = useRef(null);
  const previousShipmentStatuses = useRef(null);
  const hasGeolocation = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [shipments, setShipments] = useState([]);
  const [offers, setOffers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    fullName: userFullName,
    phone: userPhone,
    nidaNumber: "",
    licenseNumber: "",
    licenseExpiry: "",
  });
  const [facePhoto, setFacePhoto] = useState(null);
  const [nidaDocument, setNidaDocument] = useState(null);
  const [licenseDocument, setLicenseDocument] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: "",
    vehicleType: "",
    capacityKg: "",
  });
  const [vehiclePhotos, setVehiclePhotos] = useState({});
  const [locations, setLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [commissionPaymentOpen, setCommissionPaymentOpen] = useState(false);
  const [commissionReference, setCommissionReference] = useState("");
  const [submittingCommission, setSubmittingCommission] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [startingSimulationId, setStartingSimulationId] = useState(null);
  const [actingOnOfferId, setActingOnOfferId] = useState(null);
  const [updatingShipmentId, setUpdatingShipmentId] = useState(null);
  const [deliveryConfirmationShipmentId, setDeliveryConfirmationShipmentId] = useState(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState("");
  const [deliveryCodeError, setDeliveryCodeError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    if (userRole !== "DRIVER") {
      navigate("/dashboard");
      return;
    }

    const loadShipments = async () => {
      setLoading(true);
      setError("");
      try {
        const [shipmentResponse, profileResponse, vehicleResponse] = await Promise.all([
          api.get(`/shipments/driver/${userId}`),
          api.get("/drivers/me/profile"),
          api.get(`/vehicles/driver/${userId}`),
        ]);
        const driverProfile = profileResponse.data;
        const initialShipments = Array.isArray(shipmentResponse.data) ? shipmentResponse.data : [];
        previousShipmentStatuses.current = new Map(
          initialShipments.map((shipment) => [shipment.id, shipment.status]),
        );
        setShipments(initialShipments);
        setProfile(driverProfile);
        setProfileForm({
          fullName: driverProfile.fullName || userFullName,
          phone: driverProfile.phone || userPhone,
          nidaNumber: driverProfile.nidaNumber || "",
          licenseNumber: driverProfile.licenseNumber || "",
          licenseExpiry: driverProfile.licenseExpiry || "",
        });
        setVehicles(Array.isArray(vehicleResponse.data) ? vehicleResponse.data : []);
      } catch {
        setError(t("backend_error"));
      } finally {
        setLoading(false);
      }
    };

    loadShipments();
  }, [navigate, t, userFullName, userId, userPhone, userRole]);

  useEffect(() => {
    if (!userId || userRole !== "DRIVER") return undefined;
    let isActive = true;
    const refreshDriverShipments = async () => {
      try {
        const response = await api.get(`/shipments/driver/${userId}`);
        if (!isActive) return;
        const nextShipments = Array.isArray(response.data) ? response.data : [];
        const previousStatuses = previousShipmentStatuses.current;
        if (previousStatuses) {
          const cancelledShipment = nextShipments.find((shipment) => (
            shipment.status === "CANCELLED"
            && previousStatuses.get(shipment.id) !== "CANCELLED"
          ));
          if (cancelledShipment) {
            setNewOrderNotification({ ...cancelledShipment, type: "CANCELLED" });
          }
        }
        previousShipmentStatuses.current = new Map(
          nextShipments.map((shipment) => [shipment.id, shipment.status]),
        );
        setShipments(nextShipments);
      } catch {
        // Keep the last known assignments visible during transient refresh failures.
      }
    };
    const intervalId = window.setInterval(refreshDriverShipments, 10000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [userId, userRole]);

  useEffect(() => {
    if (!profile?.available || profile?.isRestricted) return undefined;
    let isActive = true;
    const refreshOffers = async () => {
      try {
        const response = await api.get("/drivers/me/jobs");
        if (!isActive) return;
        const nextOffers = Array.isArray(response.data) ? response.data : [];
        const nextOfferIds = new Set(nextOffers.map((offer) => offer.id));
        if (previousOfferIds.current) {
          const newlyAvailable = nextOffers.filter((offer) => !previousOfferIds.current.has(offer.id));
          if (newlyAvailable.length > 0) setNewOrderNotification(newlyAvailable[0]);
        }
        previousOfferIds.current = nextOfferIds;
        setOffers(nextOffers);
      } catch {
        if (isActive) setError(t("backend_error"));
      }
    };

    refreshOffers();
    const intervalId = window.setInterval(refreshOffers, 5000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [profile?.available, profile?.isRestricted, t]);

  useEffect(() => {
    if (!userId) return undefined;
    let isActive = true;
    const refreshProfile = async () => {
      try {
        const response = await api.get("/drivers/me/profile");
        if (isActive) setProfile(response.data);
      } catch {
        if (isActive) setError(t("backend_error"));
      }
    };
    const intervalId = window.setInterval(refreshProfile, 10000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [t, userId]);

  useEffect(() => {
    if (!newOrderNotification) return undefined;
    const timeoutId = window.setTimeout(() => setNewOrderNotification(null), 8000);
    return () => window.clearTimeout(timeoutId);
  }, [newOrderNotification]);

  const inTransitShipmentIds = shipments
    .filter((shipment) => shipment.status === "IN_TRANSIT"
      && shipment.id !== simulation?.shipmentId)
    .map((shipment) => shipment.id)
    .join(",");

  useEffect(() => {
    if (!inTransitShipmentIds) return undefined;
    if (!hasGeolocation) return undefined;

    let lastSentAt = 0;
    const shipmentIds = inTransitShipmentIds.split(",");
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const currentTime = Date.now();
        if (currentTime - lastSentAt < 15000) return;
        lastSentAt = currentTime;
        try {
          await Promise.all(shipmentIds.map((shipmentId) => api.post(
            `/shipments/${shipmentId}/location`,
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          )));
        } catch {
          setError(t("backend_error"));
        }
      },
      () => setError(t("driver_gps_denied")),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasGeolocation, inTransitShipmentIds, simulation?.shipmentId, t]);

  useEffect(() => {
    if (!simulation) return undefined;
    let isActive = true;
    let inFlight = false;
    let nextIndex = 0;
    let timeoutId;
    const sendNextCoordinate = async () => {
      if (!isActive || inFlight) return;
      inFlight = true;
      const point = simulation.path[nextIndex];
      const coordinates = getValidCoordinates(point?.latitude, point?.longitude)
        || simulationFallbackCoordinates.origin;
      const payload = {
        latitude: Number(coordinates[0].toFixed(7)),
        longitude: Number(coordinates[1].toFixed(7)),
      };
      try {
        await api.post(`/shipments/${simulation.shipmentId}/location`, payload);
        if (!isActive) return;
        setError("");
        nextIndex += 1;
        setSimulationProgress((nextIndex / simulation.path.length) * 100);
        if (nextIndex >= simulation.path.length) {
          setSimulation(null);
          setSuccess(t("driver_simulation_complete"));
          return;
        }
      } catch (requestError) {
        if (isActive) {
          const status = requestError?.response?.status;
          if (status === 429 || status === 400) {
            console.warn(`Driver movement simulation skipped a location update (HTTP ${status}).`);
            setError(t("driver_simulation_step_skipped"));
            nextIndex += 1;
            setSimulationProgress((nextIndex / simulation.path.length) * 100);
            if (nextIndex >= simulation.path.length) {
              setSimulation(null);
              setSuccess(t("driver_simulation_complete"));
              return;
            }
          } else if (!requestError?.response || status >= 500) {
            setError(t("driver_simulation_retrying"));
          } else {
            setError(typeof requestError?.response?.data === "string"
              ? requestError.response.data
              : t("driver_simulation_error"));
            setSimulation(null);
            return;
          }
        }
      } finally {
        inFlight = false;
      }
      if (isActive) timeoutId = window.setTimeout(sendNextCoordinate, SIMULATION_INTERVAL_MS);
    };

    sendNextCoordinate();
    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [simulation, t]);

  const saveDriverProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (facePhoto && !isValidUpload(facePhoto, vehiclePhotoTypes)) {
      setError(facePhoto.size > 1_000_000 ? t("driver_photo_too_large") : t("driver_invalid_photo"));
      return;
    }
    if (!profile?.hasNidaDocument && !nidaDocument) {
      setError(t("driver_nida_document_required"));
      return;
    }
    if (nidaDocument && !isValidUpload(nidaDocument, vehiclePhotoTypes)) {
      setError(nidaDocument.size > 1_000_000 ? t("driver_nida_document_too_large") : t("driver_invalid_nida_document"));
      return;
    }
    if (!profile?.hasLicenseDocument && !licenseDocument) {
      setError(t("driver_license_document_required"));
      return;
    }
    if (licenseDocument && !isValidUpload(licenseDocument, licenseDocumentTypes)) {
      setError(licenseDocument.size > 1_000_000 ? t("driver_document_too_large") : t("driver_invalid_document"));
      return;
    }
    setSavingProfile(true);

    try {
      const profileResponse = await api.put("/drivers/me/profile", {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        nidaNumber: profileForm.nidaNumber,
        licenseNumber: profileForm.licenseNumber,
        licenseExpiry: profileForm.licenseExpiry,
      });
      let updatedProfile = profileResponse.data;

      if (facePhoto) {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(facePhoto);
        });
        const photoResponse = await api.put("/drivers/me/profile/photo", {
          contentType: facePhoto.type,
          base64Data,
        });
        updatedProfile = photoResponse.data;
        setFacePhoto(null);
      }

      if (licenseDocument) {
        const documentBody = new FormData();
        documentBody.append("document", licenseDocument);
        const documentResponse = await api.put("/drivers/me/profile/license-document", documentBody, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        updatedProfile = documentResponse.data;
        setLicenseDocument(null);
      }

      if (nidaDocument) {
        const documentBody = new FormData();
        documentBody.append("document", nidaDocument);
        const documentResponse = await api.put("/drivers/me/profile/nida-document", documentBody, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        updatedProfile = documentResponse.data;
        setNidaDocument(null);
      }

      setProfile(updatedProfile);
      const storedUser = JSON.parse(localStorage.getItem("user"));
      localStorage.setItem("user", JSON.stringify({
        ...storedUser,
        fullName: updatedProfile.fullName,
        phone: updatedProfile.phone,
      }));
      setSuccess(t("driver_profile_saved"));
    } catch (err) {
      setError(typeof err.response?.data === "string" ? err.response.data : t("backend_error"));
    } finally {
      setSavingProfile(false);
    }
  };

  const registerVehicle = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (vehiclePhotoFields.some(({ name }) => !isValidUpload(vehiclePhotos[name], vehiclePhotoTypes))) {
      const hasOversizedPhoto = vehiclePhotoFields.some(({ name }) => vehiclePhotos[name]?.size > 1_000_000);
      setError(hasOversizedPhoto ? t("driver_photo_too_large") : t("driver_invalid_photo"));
      return;
    }
    setSavingVehicle(true);
    try {
      const payload = {
        driverId: userId,
        plateNumber: vehicleForm.plateNumber,
        vehicleType: vehicleForm.vehicleType,
        capacityKg: Number(vehicleForm.capacityKg),
      };
      const body = new FormData();
      body.append("vehicle", new Blob([JSON.stringify(payload)], { type: "application/json" }));
      vehiclePhotoFields.forEach(({ name }) => body.append(name, vehiclePhotos[name]));
      const response = await api.post("/vehicles/onboard", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setVehicles((currentVehicles) => [...currentVehicles, response.data]);
      setVehicleForm({ plateNumber: "", vehicleType: "", capacityKg: "" });
      setVehiclePhotos({});
      setSuccess(t("driver_vehicle_registered"));
    } catch (err) {
      setError(typeof err.response?.data === "string" ? err.response.data : t("backend_error"));
    } finally {
      setSavingVehicle(false);
    }
  };

  const updateAvailability = async () => {
    if (profile?.isRestricted && !profile?.available) {
      setError("Lipa kamisheni kabla ya kwenda mtandaoni.");
      return;
    }
    if (!profile.available && profile.approvalStatus !== "APPROVED") {
      setError(profile.approvalStatus === "REJECTED"
        ? t("driver_approval_rejected_notice")
        : t("driver_approval_pending_notice"));
      return;
    }

    const available = !profile.available;
    setError("");
    setUpdatingAvailability(true);
    try {
      const response = await api.put("/drivers/me/availability", { available });
      setProfile(response.data);
      if (available) {
        const offersResponse = await api.get("/drivers/me/jobs");
        setOffers(Array.isArray(offersResponse.data) ? offersResponse.data : []);
      } else {
        setOffers([]);
      }
    } catch (requestError) {
      const serverMessage = requestError.response?.data;
      setError(serverMessage === "Register a vehicle before going online"
        ? t("driver_vehicle_required_online")
        : typeof serverMessage === "string" ? serverMessage : t("backend_error"));
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const submitCommissionPayment = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmittingCommission(true);
    try {
      const response = await api.post("/drivers/me/pay-commission", { reference: commissionReference.trim() });
      setProfile((current) => ({
        ...current,
        commissionPaymentPending: true,
        commissionPaymentReference: response.data.reference,
      }));
      setCommissionReference("");
      setCommissionPaymentOpen(false);
      setSuccess(t("driver_commission_pending"));
    } catch (requestError) {
      setError(typeof requestError.response?.data === "string" ? requestError.response.data : t("backend_error"));
    } finally {
      setSubmittingCommission(false);
    }
  };

  const respondToOffer = async (shipment, accept) => {
    setError("");
    setSuccess("");
    setActingOnOfferId(shipment.id);
    try {
      if (accept) {
        const response = await api.post(`/drivers/me/jobs/${shipment.id}/accept`);
        setShipments((currentShipments) => [
          ...currentShipments.filter((currentShipment) => currentShipment.id !== shipment.id),
          response.data,
        ]);
        setSuccess(t("driver_job_accepted"));
      } else {
        await api.post(`/drivers/me/jobs/${shipment.id}/reject`);
        setSuccess(t("driver_job_rejected"));
      }
      setOffers((currentOffers) => currentOffers.filter((offer) => offer.id !== shipment.id));
    } catch {
      setError(t("backend_error"));
    } finally {
      setActingOnOfferId(null);
    }
  };

  const updateStatus = async (shipment, deliveryCode = "") => {
    const transition = nextStatus[shipment.status];
    if (!transition) return;

    setError("");
    setSuccess("");
    setUpdatingShipmentId(shipment.id);

    try {
      await api.put(`/shipments/${shipment.id}/status`, {
        status: transition.status,
        location: locations[shipment.id]?.trim() || null,
        deliveryCode: transition.status === "DELIVERED" ? deliveryCode : null,
      });
      setShipments((currentShipments) =>
        currentShipments.map((currentShipment) =>
          currentShipment.id === shipment.id
            ? { ...currentShipment, status: transition.status }
            : currentShipment,
        ),
      );
      if (transition.status === "DELIVERED") {
        const profileResponse = await api.get("/drivers/me/profile");
        setProfile(profileResponse.data);
        if (profileResponse.data.isRestricted) setOffers([]);
      }
      if (simulation?.shipmentId === shipment.id) setSimulation(null);
      if (transition.status === "DELIVERED") {
        setDeliveryCodeInput("");
        setDeliveryConfirmationShipmentId(null);
        setDeliveryCodeError("");
      }
      setSuccess(transition.status === "DELIVERED"
        ? t("driver_payout_ready")
        : t("driver_status_updated"));
    } catch (requestError) {
      const responseMessage = requestError.response?.data;
      const message = typeof responseMessage === "string"
        ? responseMessage
        : requestError.response?.status === 400
          ? t("driver_delivery_code_invalid")
          : t("backend_error");
      if (transition.status === "DELIVERED") setDeliveryCodeError(message);
      else setError(message);
    } finally {
      setUpdatingShipmentId(null);
    }
  };

  const confirmDelivery = async (event) => {
    event.preventDefault();
    const shipment = shipments.find((item) => item.id === deliveryConfirmationShipmentId);
    if (!shipment || !/^\d{6}$/.test(deliveryCodeInput)) {
      setDeliveryCodeError(t("driver_delivery_code_required"));
      return;
    }
    setDeliveryCodeError("");
    await updateStatus(shipment, deliveryCodeInput);
  };

  const toggleMovementSimulation = async (shipment) => {
    if (simulation?.shipmentId === shipment.id) {
      setSimulation(null);
      setSimulationProgress(0);
      return;
    }
    if (!["ASSIGNED", "IN_TRANSIT"].includes(shipment.status)) return;

    setError("");
    setSuccess("");
    setStartingSimulationId(shipment.id);
    try {
      const path = await createSimulationPath(shipment);
      setSimulation({ shipmentId: shipment.id, path });
      setSimulationProgress(0);
    } catch (simulationError) {
      setError(simulationError?.message || t("driver_simulation_error"));
    } finally {
      setStartingSimulationId(null);
    }
  };

  if (!userId || userRole !== "DRIVER") return null;

  const summary = [
    {
      label: "driver_total_shipments",
      value: shipments.length,
      color: "text-white",
    },
    {
      label: "driver_pending_pickups",
      value: shipments.filter((shipment) => shipment.status === "ASSIGNED").length,
      color: "text-blue-400",
    },
    {
      label: "driver_in_transit",
      value: shipments.filter((shipment) => shipment.status === "IN_TRANSIT").length,
      color: "text-orange-400",
    },
    {
      label: "driver_delivered",
      value: shipments.filter((shipment) => shipment.status === "DELIVERED").length,
      color: "text-green-400",
    },
  ];

  const groups = statusOrder
    .map((status) => ({
      status,
      shipments: shipments.filter((shipment) => shipment.status === status),
    }))
    .filter((group) => group.status !== "PENDING")
    .filter((group) => group.shipments.length > 0);
  const unreadOffersCount = offers.filter((offer) => !seenOfferIds.includes(offer.id)).length;
  const markOffersAsRead = () => {
    const nextSeenOfferIds = [...new Set([...seenOfferIds, ...offers.map((offer) => offer.id)])];
    setSeenOfferIds(nextSeenOfferIds);
    localStorage.setItem(seenOffersStorageKey, JSON.stringify(nextSeenOfferIds));
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-zinc-950/70 px-4 py-2.5 text-white placeholder-zinc-500 transition focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/25 via-zinc-950 to-zinc-950 text-white">
      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="mb-8 flex flex-col justify-between gap-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
              <Truck size={27} aria-hidden="true" />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">{t("driver_profile")}</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {profile?.fullName || userFullName || t("driver_dashboard_title")}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">{t("driver_dashboard_subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={t("driver_notifications_button", { count: unreadOffersCount })}
              aria-expanded={notificationsOpen}
              onClick={() => {
                if (!notificationsOpen) markOffersAsRead();
                setNotificationsOpen((open) => !open);
              }}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-zinc-200 transition hover:border-amber-300/40 hover:bg-amber-300/[0.06] hover:text-amber-100"
            >
              <Bell size={19} aria-hidden="true" />
              {unreadOffersCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-zinc-950 bg-amber-300 px-1 text-[10px] font-bold text-zinc-950">
                  {unreadOffersCount > 9 ? "9+" : unreadOffersCount}
                </span>
              )}
            </button>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ${
              profile?.available
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                : "border-zinc-700 bg-zinc-900/80 text-zinc-300"
            }`}>
              <span className={`h-2 w-2 rounded-full ${profile?.available ? "animate-pulse bg-emerald-400" : "bg-zinc-500"}`} />
              {profile?.available ? t("driver_available") : t("driver_unavailable")}
            </span>
            <button
              type="button"
              onClick={updateAvailability}
              disabled={updatingAvailability || (!profile?.available && profile?.approvalStatus !== "APPROVED")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                profile?.available
                  ? "border border-amber-400/30 bg-amber-400/5 text-amber-200 hover:bg-amber-400/10"
                  : "bg-amber-300 text-zinc-950 shadow-lg shadow-amber-400/10 hover:bg-amber-200"
              }`}
            >
              <Wifi size={16} aria-hidden="true" />
              {updatingAvailability
                ? t("driver_updating")
                : profile?.available ? t("driver_go_offline") : t("driver_go_online")}
            </button>
          </div>
        </header>

        {deliveryConfirmationShipmentId != null && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/75 p-2 backdrop-blur-sm sm:p-4">
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="delivery-confirmation-title"
              onSubmit={confirmDelivery}
              className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950 p-4 shadow-2xl shadow-black/50 sm:max-w-md sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">{t("driver_delivery_confirmation")}</p>
                  <h2 id="delivery-confirmation-title" className="mt-2 text-xl font-bold text-white">{t("driver_delivery_code_prompt")}</h2>
                </div>
                <button type="button" aria-label={t("close_menu")} onClick={() => setDeliveryConfirmationShipmentId(null)} className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <p className="mb-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.06] p-3 text-sm leading-6 text-sky-100">{t("driver_delivery_customer_instruction")}</p>
              <label className="block text-sm font-medium text-zinc-300">
                <span className="mb-2 block">{t("driver_delivery_code")}</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={deliveryCodeInput}
                  onChange={(event) => {
                    setDeliveryCodeInput(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setDeliveryCodeError("");
                  }}
                  placeholder="000000"
                  className={`${inputClass} text-center text-xl tracking-[0.25em]`}
                />
              </label>
              {deliveryCodeError && <p role="alert" className="mt-3 rounded-lg border border-red-300/20 bg-red-300/[0.07] px-3 py-2 text-sm text-red-100">{deliveryCodeError}</p>}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setDeliveryConfirmationShipmentId(null)} className="min-h-11 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.05]">{t("driver_delivery_cancel")}</button>
                <button type="submit" disabled={updatingShipmentId === deliveryConfirmationShipmentId || deliveryCodeInput.length !== 6} className="min-h-11 rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">{updatingShipmentId === deliveryConfirmationShipmentId ? t("driver_updating") : t("driver_complete_delivery")}</button>
              </div>
            </form>
          </div>
        )}

        {newOrderNotification && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] p-4 text-amber-50 shadow-lg shadow-amber-950/20 backdrop-blur-xl"
          >
            <Bell size={19} className="mt-0.5 shrink-0 text-amber-200" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(newOrderNotification.type === "CANCELLED" ? "driver_shipment_cancelled_toast" : "driver_new_order_toast")}</p>
              <p className="mt-1 text-sm text-amber-100/80">
                {t(newOrderNotification.type === "CANCELLED" ? "driver_shipment_cancelled_notification" : "driver_new_shipment_notification", {
                  id: newOrderNotification.id,
                  origin: newOrderNotification.origin,
                  destination: newOrderNotification.destination,
                })}
              </p>
            </div>
            <button
              type="button"
              aria-label={t("driver_dismiss_notification")}
              onClick={() => setNewOrderNotification(null)}
              className="rounded-lg p-1 text-amber-100/70 transition hover:bg-white/10 hover:text-white"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 mb-5">
            {success}
          </div>
        )}
        {!hasGeolocation && shipments.some((shipment) => shipment.status === "IN_TRANSIT") && (
          <div role="alert" className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm rounded-lg px-4 py-3 mb-5">
            {t("driver_gps_denied")}
          </div>
        )}
        {profile?.isRestricted && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-300/30 bg-red-400/[0.09] p-4 text-sm leading-6 text-red-100 shadow-lg shadow-red-950/20">
            Akaunti yako imezuiwa kupokea kazi mpya kwa sababu umefikisha kikomo cha mizigo 3 iliyokamilika bila kulipa kamisheni. Tafadhali lipa kamisheni ili kufungua akaunti.
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500">{t("driver_loading")}</p>
        ) : (
          <>
            <section className="mb-6 rounded-2xl border border-amber-200/20 bg-gradient-to-br from-amber-300/[0.11] via-zinc-950/75 to-emerald-300/[0.04] p-5 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/70">{t("driver_commission_wallet")}</p>
                  <p className="mt-2 text-3xl font-bold text-white">TSh {Number(profile?.commissionBalance || 0).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-zinc-400">{t("driver_unpaid_jobs", { count: profile?.unpaidJobCount || 0, max: profile?.maxUnpaidJobs || 3 })}</p>
                </div>
                <button type="button" disabled={profile?.commissionPaymentPending || ((profile?.commissionBalance || 0) <= 0 && (profile?.unpaidJobCount || 0) <= 0)} onClick={() => setCommissionPaymentOpen((open) => !open)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
                  <CreditCard size={17} aria-hidden="true" />
                  {profile?.commissionPaymentPending ? t("driver_commission_pending") : "Lipa Kamisheni"}
                </button>
              </div>
              {profile?.commissionPaymentPending && <p className="mt-4 text-sm text-amber-100">{t("driver_commission_reference_pending", { reference: profile.commissionPaymentReference || "" })}</p>}
              {commissionPaymentOpen && (
                <form onSubmit={submitCommissionPayment} className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="text-sm text-zinc-300">
                    <span className="mb-2 block">{t("driver_transaction_reference")}</span>
                    <input required maxLength={80} value={commissionReference} onChange={(event) => setCommissionReference(event.target.value)} placeholder={t("driver_transaction_reference_placeholder")} className={inputClass} />
                  </label>
                  <button type="submit" disabled={submittingCommission || !commissionReference.trim()} className="self-end rounded-xl bg-emerald-300 px-5 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50">{submittingCommission ? t("driver_updating") : t("driver_submit_payment_reference")}</button>
                  <p className="text-xs text-zinc-500 sm:col-span-2">{t("driver_commission_verification_note")}</p>
                </form>
              )}
            </section>
            <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("driver_dashboard_title")}>
              {summary.map((item, index) => {
                const MetricIcon = [Package, Clock3, Truck, CheckCircle2][index];
                return (
                  <div key={item.label} className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 shadow-lg shadow-black/10 backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/15 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-zinc-400 sm:text-sm">{t(item.label)}</p>
                      <span className="rounded-xl bg-white/[0.06] p-2 text-zinc-400 transition group-hover:text-amber-200">
                        <MetricIcon size={17} aria-hidden="true" />
                      </span>
                    </div>
                    <p className={`mt-3 text-3xl font-bold tracking-tight ${item.color}`}>{item.value}</p>
                  </div>
                );
              })}
            </section>

            <section className="mb-8 grid items-start gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold text-white">
                      <UserRound size={17} className="text-amber-200" aria-hidden="true" />
                      {t("driver_profile")}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">{t("driver_profile_subtitle")}</p>
                  </div>
                </div>
                {profile?.approvalStatus === "PENDING_APPROVAL" && (
                  <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
                    {t("driver_approval_pending_notice")}
                  </p>
                )}
                {profile?.approvalStatus === "REJECTED" && (
                  <p className="mb-4 rounded-lg border border-red-500/20 bg-red-400/5 px-3 py-2 text-xs text-red-200">
                    {t("driver_approval_rejected_notice")}
                  </p>
                )}
                {vehicles.length === 0 ? (
                  <p className="mb-4 text-xs text-amber-200/80">{t("driver_vehicle_required_online")}</p>
                ) : null}

                <form onSubmit={saveDriverProfile} className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-zinc-300">
                    <span className="mb-1 block">{t("full_name")}</span>
                    <input
                      type="text"
                      maxLength={150}
                      required
                      value={profileForm.fullName}
                      onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    <span className="mb-1 block">{t("phone")}</span>
                    <input
                      type="tel"
                      maxLength={20}
                      required
                      value={profileForm.phone}
                      onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    <span className="mb-1 block">{t("nida_number")}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      minLength={20}
                      maxLength={20}
                      pattern="[0-9]{20}"
                      required
                      value={profileForm.nidaNumber}
                      onChange={(event) => setProfileForm((current) => ({ ...current, nidaNumber: event.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    <span className="mb-1 block">{t("license_number")}</span>
                    <input
                      type="text"
                      maxLength={80}
                      required
                      value={profileForm.licenseNumber}
                      onChange={(event) => setProfileForm((current) => ({ ...current, licenseNumber: event.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    <span className="mb-1 block">{t("license_expiry")}</span>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().slice(0, 10)}
                      value={profileForm.licenseExpiry}
                      onChange={(event) => setProfileForm((current) => ({ ...current, licenseExpiry: event.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm text-zinc-300">
                    <span className="mb-1 block">{t("face_photo")}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="user"
                      required={!profile?.hasFacePhoto}
                      onChange={(event) => setFacePhoto(event.target.files?.[0] || null)}
                      className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-amber-400 file:px-3 file:py-1 file:font-semibold file:text-zinc-950`}
                    />
                    {facePhoto && <span className="mt-1 block text-xs text-zinc-500">{facePhoto.name}</span>}
                    {profile?.hasFacePhoto && !facePhoto && <span className="mt-1 block text-xs text-emerald-300">{t("face_photo_selected")}</span>}
                  </label>
                  <label className="text-sm text-zinc-300 sm:col-span-2">
                    <span className="mb-1 block">{t("driver_nida_document")}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required={!profile?.hasNidaDocument}
                      onChange={(event) => setNidaDocument(event.target.files?.[0] || null)}
                      className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-amber-400 file:px-3 file:py-1 file:font-semibold file:text-zinc-950`}
                    />
                    {nidaDocument && <span className="mt-1 block text-xs text-zinc-500">{nidaDocument.name}</span>}
                    {profile?.hasNidaDocument && !nidaDocument && <span className="mt-1 block text-xs text-emerald-300">{t("driver_nida_document_uploaded")}</span>}
                    <span className="mt-1 block text-xs text-zinc-500">{t("driver_nida_document_requirements")}</span>
                  </label>
                  <label className="text-sm text-zinc-300 sm:col-span-2">
                    <span className="mb-1 block">{t("driver_license_document")}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      required={!profile?.hasLicenseDocument}
                      onChange={(event) => setLicenseDocument(event.target.files?.[0] || null)}
                      className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-amber-400 file:px-3 file:py-1 file:font-semibold file:text-zinc-950`}
                    />
                    {licenseDocument && <span className="mt-1 block text-xs text-zinc-500">{licenseDocument.name}</span>}
                    {profile?.hasLicenseDocument && !licenseDocument && (
                      <span className="mt-1 block text-xs text-emerald-300">{t("driver_license_document_uploaded")}</span>
                    )}
                    <span className="mt-1 block text-xs text-zinc-500">{t("upload_document_requirements")}</span>
                  </label>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-500 disabled:opacity-50 sm:col-span-2"
                  >
                    {savingProfile ? t("driver_updating") : t("driver_save_profile")}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
                  <Truck size={17} className="text-amber-200" aria-hidden="true" />
                  {t("driver_vehicle")}
                </h2>
                {vehicles.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="flex justify-between gap-3 rounded-lg bg-zinc-900/80 px-3 py-2 text-sm">
                        <span className="text-white">{vehicle.plateNumber}</span>
                        <span className="text-zinc-400">{vehicle.vehicleType} · {vehicle.capacityKg} kg</span>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={registerVehicle} className="space-y-3">
                  <label className="block text-sm text-zinc-300">
                    <span className="mb-1 block">{t("plate_number")}</span>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      value={vehicleForm.plateNumber}
                      onChange={(event) => setVehicleForm((current) => ({ ...current, plateNumber: event.target.value }))}
                      className={inputClass}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="text-sm text-zinc-300">
                      <span className="mb-1 block">{t("vehicle_type")}</span>
                      <VehicleTypeSelector
                        value={vehicleForm.vehicleType}
                        onChange={(vehicleType) => setVehicleForm((current) => ({ ...current, vehicleType }))}
                      />
                    </div>
                    <label className="text-sm text-zinc-300">
                      <span className="mb-1 block">{t("capacity_kg")}</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        value={vehicleForm.capacityKg}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, capacityKg: event.target.value }))}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <fieldset className="space-y-3">
                    <legend className="mb-2 text-sm font-medium text-zinc-300">
                      {t("vehicle_photos_title")}
                    </legend>
                    {vehiclePhotoFields.map(({ name, label }) => (
                      <label key={name} className="block text-sm text-zinc-300">
                        <span className="mb-1 block">{t(label)}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          required
                          onChange={(event) => setVehiclePhotos((current) => ({
                            ...current,
                            [name]: event.target.files?.[0] || null,
                          }))}
                          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-amber-400 file:px-3 file:py-1 file:font-semibold file:text-zinc-950`}
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
                    disabled={savingVehicle}
                    className="w-full rounded-lg border border-amber-500/40 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/10 disabled:opacity-50"
                  >
                    {savingVehicle ? t("driver_updating") : t("driver_register_vehicle")}
                  </button>
                </form>
              </div>
            </section>

            <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-lg shadow-black/10 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white">{t("driver_notifications")}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{t("driver_notifications_description")}</p>
                </div>
                <button
                  type="button"
                  aria-expanded={notificationsOpen}
                  onClick={() => {
                    if (!notificationsOpen) markOffersAsRead();
                    setNotificationsOpen((open) => !open);
                  }}
                  className="shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:border-amber-300/30 hover:bg-zinc-800"
                >
                  {notificationsOpen ? t("driver_notifications_hide") : t("driver_notifications_view")}
                  {unreadOffersCount > 0 && (
                    <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-zinc-950">
                      {unreadOffersCount}
                    </span>
                  )}
                </button>
              </div>
              {notificationsOpen && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  {offers.length === 0 ? (
                    <p className="text-sm text-zinc-500">{t("driver_no_offers")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {offers.map((shipment) => (
                        <li key={shipment.id} className="text-sm text-zinc-300">
                          {t("driver_new_shipment_notification", {
                            id: shipment.id,
                            origin: shipment.origin,
                            destination: shipment.destination,
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>

            <section className="mb-8 rounded-2xl border border-sky-400/15 bg-sky-400/[0.035] p-5 shadow-lg shadow-black/10 backdrop-blur-xl sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-semibold text-white">
                    <Package size={18} className="text-sky-200" aria-hidden="true" />
                    {t("driver_available_jobs")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">{t("driver_available_jobs_subtitle")}</p>
                </div>
                {profile?.available && <span className="text-sm text-emerald-300">{t("driver_available")}</span>}
              </div>
              {profile?.approvalStatus === "PENDING_APPROVAL" ? (
                <p className="text-sm text-amber-200">{t("driver_approval_pending_notice")}</p>
              ) : profile?.approvalStatus === "REJECTED" ? (
                <p className="text-sm text-red-200">{t("driver_approval_rejected_notice")}</p>
              ) : !profile?.available ? (
                <p className="text-sm text-zinc-500">{t("driver_go_online_for_jobs")}</p>
              ) : offers.filter((shipment) => shipment.status === "PENDING").length === 0 ? (
                <p className="text-sm text-zinc-500">{t("driver_no_offers")}</p>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {offers.filter((shipment) => shipment.status === "PENDING").map((shipment) => (
                    <article key={shipment.id} className="flex flex-col justify-between gap-4 rounded-xl border border-white/[0.08] bg-zinc-950/45 p-4 transition hover:border-sky-300/25 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-medium text-white">#{shipment.id}: {shipment.origin} to {shipment.destination}</h3>
                        <p className="mt-1 text-sm text-zinc-500">{shipment.cargoType} · {shipment.weightKg} kg</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={actingOnOfferId === shipment.id} onClick={() => respondToOffer(shipment, false)} className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">{t("driver_reject_job")}</button>
                        <button type="button" disabled={actingOnOfferId === shipment.id || profile?.isRestricted} onClick={() => respondToOffer(shipment, true)} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50">{t("driver_accept_job")}</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {shipments.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-10 text-center shadow-xl">
                <p className="text-zinc-400">{t("driver_empty")}</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/70">{t("driver_shipment_overview")}</p>
                    <h2 className="text-2xl font-bold tracking-tight text-white">{t("driver_shipments_heading")}</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-300">
                    {groups.reduce((count, group) => count + group.shipments.length, 0)}
                  </span>
                </div>
                {groups.map((group) => (
                  <section key={group.status}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                        {t(`driver_status_${group.status.toLowerCase()}`)}
                      </h3>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-zinc-400">
                        {group.shipments.length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {group.shipments.map((shipment) => {
                        const transition = nextStatus[shipment.status];
                        const isUpdating = updatingShipmentId === shipment.id;

                        return (
                          <article key={shipment.id} className={`rounded-2xl border bg-gradient-to-br from-white/[0.055] to-white/[0.015] p-5 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 sm:p-6 ${
                            ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(shipment.status)
                              ? "border-amber-300/20 hover:border-amber-300/35"
                              : "border-white/[0.08] hover:border-white/15"
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div>
                                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                                  <MapPin size={17} className="shrink-0 text-amber-200" aria-hidden="true" />
                                  #{shipment.id}: {shipment.origin} to {shipment.destination}
                                </h3>
                                <p className="mt-2 text-sm text-zinc-400">
                                  {shipment.cargoType} · {shipment.weightKg} kg
                                  {shipment.price != null &&
                                    ` · ${Number(shipment.price).toLocaleString()} TZS`}
                                </p>
                              </div>
                              <span
                                className={`text-xs font-medium px-3 py-1 rounded-full border w-fit ${
                                  statusColors[shipment.status] ||
                                  "bg-zinc-800 text-zinc-400 border-zinc-700"
                                }`}
                              >
                                {t(`driver_status_${shipment.status.toLowerCase()}`)}
                              </span>
                            </div>

                                {["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(shipment.status) && (
                                  <section className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/5 p-4">
                                    <h4 className="flex items-center gap-2 text-sm font-semibold text-sky-100">
                                      <UserRound size={16} aria-hidden="true" />
                                      {t("driver_customer_information")}
                                    </h4>
                                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                                      <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-3">
                                        <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                                          <UserRound size={13} aria-hidden="true" />{t("driver_customer_name")}
                                        </dt>
                                        <dd className="mt-1 font-medium text-white">
                                          {shipment.customer?.fullName || t("driver_information_unavailable")}
                                        </dd>
                                      </div>
                                      <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-3">
                                        <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                                          <Phone size={13} aria-hidden="true" />{t("driver_customer_phone")}
                                        </dt>
                                        <dd className="mt-1 font-medium text-white">
                                          {shipment.customer?.phone ? (
                                            <a href={`tel:${shipment.customer.phone}`} className="hover:text-sky-200">
                                              {shipment.customer.phone}
                                            </a>
                                          ) : t("driver_information_unavailable")}
                                        </dd>
                                      </div>
                                      <div className="rounded-xl border border-white/[0.06] bg-zinc-950/40 p-3">
                                        <dt className="flex items-center gap-1.5 text-xs text-zinc-500">
                                          <Mail size={13} aria-hidden="true" />{t("driver_customer_email")}
                                        </dt>
                                        <dd className="mt-1 break-all font-medium text-white">
                                          {shipment.customer?.email ? (
                                            <a href={`mailto:${shipment.customer.email}`} className="hover:text-sky-200">
                                              {shipment.customer.email}
                                            </a>
                                          ) : t("driver_information_unavailable")}
                                        </dd>
                                      </div>
                                    </dl>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                      {shipment.customer?.phone && (
                                        <a
                                          href={`tel:${shipment.customer.phone}`}
                                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-3.5 py-2.5 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-emerald-200"
                                        >
                                          <Phone size={15} aria-hidden="true" />
                                          {t("driver_call_customer")}
                                        </a>
                                      )}
                                      {getWhatsAppUrl(shipment.customer?.phone) && (
                                        <a
                                          href={getWhatsAppUrl(shipment.customer.phone)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] px-3.5 py-2.5 text-sm font-semibold text-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-400/10"
                                        >
                                          <MessageCircle size={15} aria-hidden="true" />
                                          {t("driver_whatsapp_customer")}
                                        </a>
                                      )}
                                    </div>
                                  </section>
                                )}

                                <nav className="mt-4 flex flex-wrap gap-2" aria-label={t("driver_shipment_navigation")}>
                                  <a
                                    href={getMapsSearchUrl(
                                      shipment.origin,
                                      shipment.originLatitude,
                                      shipment.originLongitude,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-3.5 py-2.5 text-sm font-semibold text-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-300/10"
                                  >
                                    <MapPin size={15} aria-hidden="true" />
                                    {t("driver_navigate_origin")}
                                    <ArrowUpRight size={14} aria-hidden="true" />
                                  </a>
                                  <a
                                    href={getMapsSearchUrl(
                                      shipment.destination,
                                      shipment.destinationLatitude,
                                      shipment.destinationLongitude,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-3.5 py-2.5 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-amber-200"
                                  >
                                    <Navigation size={15} aria-hidden="true" />
                                    {t("driver_navigate_destination")}
                                    <ArrowUpRight size={14} aria-hidden="true" />
                                  </a>
                                </nav>

                                {transition && (
                              <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
                                <label className="text-zinc-400 text-sm flex-1">
                                  <span className="block mb-2">
                                    {t("driver_location")}
                                  </span>
                                  <input
                                    type="text"
                                    value={locations[shipment.id] || ""}
                                    onChange={(event) =>
                                      setLocations((currentLocations) => ({
                                        ...currentLocations,
                                        [shipment.id]: event.target.value,
                                      }))
                                    }
                                    placeholder={t("driver_location_placeholder")}
                                    className={inputClass}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (transition.status === "DELIVERED") {
                                      setDeliveryCodeInput("");
                                      setDeliveryCodeError("");
                                      setDeliveryConfirmationShipmentId(shipment.id);
                                    } else {
                                      updateStatus(shipment);
                                    }
                                  }}
                                  disabled={isUpdating}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:opacity-50"
                                >
                                  {isUpdating
                                    ? t("driver_updating")
                                    : t(transition.label)}
                                </button>
                              </div>
                            )}
                            {["ASSIGNED", "IN_TRANSIT"].includes(shipment.status) && (
                              <div className="mt-5 rounded-xl border border-sky-300/15 bg-sky-300/[0.035] p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-sky-100">
                                  <Route size={16} aria-hidden="true" />
                                  {t("driver_simulation_controls")}
                                </div>
                                <button
                                  type="button"
                                  disabled={startingSimulationId === shipment.id}
                                  onClick={() => toggleMovementSimulation(shipment)}
                                  className="rounded-xl border border-sky-300/25 bg-sky-300/[0.08] px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-300/15 disabled:cursor-wait disabled:opacity-50"
                                >
                                  {startingSimulationId === shipment.id
                                    ? t("driver_simulation_preparing")
                                    : simulation?.shipmentId === shipment.id
                                      ? t("driver_simulation_stop")
                                      : t("driver_simulation_start")}
                                </button>
                                {simulation?.shipmentId === shipment.id && (
                                  <div className="mt-4 max-w-lg">
                                    <p className="mb-2 flex items-center justify-between text-xs font-medium text-sky-100">
                                      <span>{t("driver_simulation_progress", {
                                        progress: Math.round(simulationProgress),
                                      })}</span>
                                      <span>{Math.round(simulationProgress)}%</span>
                                    </p>
                                    <div
                                      className="h-2 overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/5"
                                      role="progressbar"
                                      aria-valuenow={Math.round(simulationProgress)}
                                      aria-valuemin={0}
                                      aria-valuemax={100}
                                      aria-label={t("driver_simulation_controls")}
                                    >
                                      <div
                                        className="relative h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-300 to-emerald-300 transition-[width] duration-700 ease-out"
                                        style={{ width: `${simulationProgress}%` }}
                                      >
                                        <span className="absolute inset-0 animate-pulse rounded-full bg-white/20" />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {shipment.status === "IN_TRANSIT" && (
                              <div className="mt-5">
                                <Suspense fallback={<p className="py-4 text-sm text-zinc-400">{t("shipment_map_loading")}</p>}>
                                  <LiveShipmentMap shipment={shipment} />
                                </Suspense>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default DriverDashboard;
