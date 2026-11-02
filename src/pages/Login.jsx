import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/axiosClient";
import LanguageSwitcher from "../components/LanguageSwitcher";
import bebaLogo from "../assets/beba_logo.png";

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.status === 401 ? t("invalid_credentials") : t("backend_error"));
    } finally {
      setLoading(false);
    }
  };

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
            {t("login_title")}
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2.5 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-1">
                {t("email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="mfano@email.com"
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-2 text-white placeholder-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-sm font-medium mb-1">
                {t("password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-2 pr-12 text-white placeholder-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="w-full rounded-lg bg-amber-400 py-2 font-semibold text-zinc-950 transition hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? t("logging_in") : t("login_button")}
            </button>
          </form>

          <p className="text-zinc-500 text-sm text-center mt-3">
            {t("no_account")}{" "}
            <Link to="/register" className="font-medium text-amber-400 hover:text-amber-300">
              {t("register_here")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;