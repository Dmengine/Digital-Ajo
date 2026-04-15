import axios from "axios";
import Constants from "expo-constants";

const REMOTE_API_FALLBACK = "https://digital-ajo.onrender.com/api";
const DEV_LOCAL_FALLBACK = "http://127.0.0.1:3001/api";
const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };

const envApiBaseUrl = typeof process.env.EXPO_PUBLIC_API_BASE_URL === "string" ? process.env.EXPO_PUBLIC_API_BASE_URL.trim() : "";
const configApiBaseUrl = typeof extra.apiBaseUrl === "string" ? extra.apiBaseUrl.trim() : "";

const hostUriCandidate =
  ((Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost ??
    "") || "";
const devHost = hostUriCandidate.split(":")[0];
const devApiFromExpoHost = devHost ? `http://${devHost}:3001/api` : DEV_LOCAL_FALLBACK;

const baseURL = __DEV__
  ? envApiBaseUrl || configApiBaseUrl || devApiFromExpoHost || DEV_LOCAL_FALLBACK
  : envApiBaseUrl || configApiBaseUrl || REMOTE_API_FALLBACK;

export const apiBaseUrl = baseURL;
export const getSocketBaseUrl = () => apiBaseUrl.replace(/\/api\/?$/, "");

let token: string | null = null;

export const setApiToken = (value: string | null) => {
  token = value;
};

export const api = axios.create({
  baseURL,
  timeout: 45000,
});

api.interceptors.request.use((config) => {
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const extractApiMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return "Request failed";
  if (typeof error.response?.data?.message === "string") return error.response.data.message;
  return error.message || "Request failed";
};
