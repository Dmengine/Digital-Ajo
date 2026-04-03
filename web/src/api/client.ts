import axios from "axios";
import { useAuthStore } from "../store/authStore";

const defaultApiBaseUrl = import.meta.env.PROD
  ? "https://digital-ajo.onrender.com/api"
  : "http://localhost:3000/api";

const resolveApiBaseUrl = (): string => {
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (!raw) return defaultApiBaseUrl;

  try {
    const parsed = new URL(raw);
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    console.warn("Invalid VITE_API_BASE_URL detected. Falling back to default API base URL.", raw);
    return defaultApiBaseUrl;
  }
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

