import axios from "axios";
import { useAuthStore } from "../store/authStore";

const defaultApiBaseUrl = import.meta.env.PROD
  ? "https://digital-ajo.onrender.com/api"
  : "/api";

const resolveApiBaseUrl = (): string => {
  const raw = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (!raw) return defaultApiBaseUrl;

  try {
    const parsed = new URL(raw);
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    console.warn("Invalid VITE_API_BASE_URL detected. Falling back to default API base URL.");
    return defaultApiBaseUrl;
  }
};

const sanitizeAxiosError = (err: unknown): Error => {
  if (!axios.isAxiosError(err)) return err instanceof Error ? err : new Error("Request failed");

  const status = err.response?.status;
  const responseMessage =
    typeof err.response?.data?.message === "string"
      ? err.response.data.message
      : typeof err.response?.data?.error === "string"
        ? err.response.data.error
        : undefined;

  const message = responseMessage || err.message || "Request failed";
  const safeError = new Error(message);
  (safeError as Error & { status?: number }).status = status;
  return safeError;
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
    return Promise.reject(sanitizeAxiosError(err));
  }
);

