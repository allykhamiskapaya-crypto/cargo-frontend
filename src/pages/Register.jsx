import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import LanguageSwitcher from "../components/LanguageSwitcher";
import bebaLogo from "../assets/beba_logo.png";

function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: "CUSTOMER",
    customerType: "INDIVIDUAL",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    companyName: "",
    tinNumber: "",
    vrnNumber: "",
    brelaNumber: "",
    contactPersonName: "",
    officeAddress: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/users", formData);
      if (formData.role === "CUSTOMER") {
        try {
          const response = await api.post("/auth/login", {
            email: formData.email,
            password: formData.password,
          });
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("user", JSON.stringify(response.data.user));
          navigate("/dashboard");
          return;
        } catch {
          alert(t("register_success"));
          navigate("/login");
          return;
        }
      }
      alert(t("register_success"));
      navigate("/login");
    } catch (err) {
      if (err.response?.status === 403 && formData.role === "DRIVER") {
        setError(t("driver_registration_approval"));
      } else if (typeof err.response?.data === "string") {
        setError(err.response.data);
      } else {
        setError(t("generic_error"));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-2 text-white placeholder-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="auth-static relative min-h-screen bg-transparent flex items-center justify-center px-4 pt-16 pb-4 sm:pt-20">
      <LanguageSwitcher />

      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-amber-500/40 bg-black/10 p-4 shadow-2xl backdrop-blur-md sm:p-5">
          <div className="mb-3 flex flex-col items-center text-center">
            <div className="mb-3 h-28 w-28 overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-900 shadow-md">
              <img
                src={bebaLogo}
                alt="BEBA, kwa usafirishaji wa uhakika na salama"
                className="h-full w-full object-contain p-1"
              />
            </div>
            <span className="text-lg font-bold text-amber-300">BEBA</span>
            <span className="text-xs text-zinc-400">{t("brand_tagline")}</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 text-center">
            {t("register_title")}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2.5 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-zinc-400">
                {t("account_type")}
              </legend>
              <div
                role="group"
                aria-label={t("account_type")}
                className="grid grid-cols-2 rounded-xl border border-amber-500/30 bg-zinc-950/60 p-1"
              >
                {["CUSTOMER", "DRIVER"].map((role) => {
                  const isSelected = formData.role === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setFormData((current) => ({
                        ...current,
                        role,
                        customerType: role === "CUSTOMER" ? current.customerType : "INDIVIDUAL",
                      }))}
                      className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        isSelected
                          ? "bg-amber-400 text-zinc-950 shadow-sm"
                          : "text-zinc-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {t(role === "CUSTOMER" ? "customer" : "driver")}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {formData.role === "CUSTOMER" && (
              <fieldset>
                <legend className="mb-1 text-sm font-medium text-zinc-400">
                  {t("customer_type")}
                </legend>
                <div
                  role="group"
                  aria-label={t("customer_type")}
                  className="grid grid-cols-2 rounded-xl border border-amber-500/30 bg-zinc-950/60 p-1"
                >
                  {["INDIVIDUAL", "COMPANY"].map((customerType) => {
                    const isSelected = formData.customerType === customerType;
                    return (
                      <button
                        key={customerType}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setFormData((current) => ({ ...current, customerType }))}
                        className={`min-h-11 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          isSelected
                            ? "bg-amber-400 text-zinc-950 shadow-sm"
                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {t(customerType === "INDIVIDUAL" ? "customer_type_individual" : "customer_type_company")}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {formData.role === "CUSTOMER" && formData.customerType === "COMPANY" && (
              <div className="grid gap-2.5 rounded-xl border border-white/10 bg-zinc-950/40 p-3 sm:grid-cols-2">
                {[
                  { name: "companyName", label: "company_name", required: true },
                  { name: "tinNumber", label: "tin_number", required: true },
                  { name: "vrnNumber", label: "vrn_number" },
                  { name: "brelaNumber", label: "brela_number" },
                  { name: "contactPersonName", label: "contact_person_name", required: true },
                ].map(({ name, label, required }) => (
                  <label key={name} className="block text-sm font-medium text-zinc-400">
                    <span className="mb-1 block">{t(label)}{required ? " *" : ` (${t("optional")})`}</span>
                    <input
                      type="text"
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      required={required}
                      className={inputClass}
                    />
                  </label>
                ))}
                <label className="block text-sm font-medium text-zinc-400 sm:col-span-2">
                  <span className="mb-1 block">{t("office_address")} *</span>
                  <textarea
                    name="officeAddress"
                    value={formData.officeAddress}
                    onChange={handleChange}
                    required
                    rows={2}
                    className={`${inputClass} resize-y`}
                  />
                </label>
              </div>
            )}

            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-1">
                {t("full_name")}
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="John Mkulima"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-1">
                {t("email")}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="mfano@email.com"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-1">
                {t("phone")}
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className={inputClass}
                placeholder="0700000000"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-1">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  maxLength={72}
                  className={`${inputClass} pr-12`}
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-400 transition hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                >
                  {showPassword ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9.9 5.2A10.8 10.8 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 003.2-.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-lg bg-amber-400 py-2 font-semibold text-zinc-950 transition hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? t("registering") : t("register_button")}
            </button>
          </form>

          <p className="text-zinc-500 text-sm text-center mt-3">
            {t("have_account")}{" "}
            <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300">
              {t("login_here")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;