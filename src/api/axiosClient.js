import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const isPublicAuthRequest =
    config.url === "/auth/login" ||
    (config.url === "/users" && config.method?.toLowerCase() === "post");
  if (token && !isPublicAuthRequest) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }
  return Promise.reject(error);
});

export default api;