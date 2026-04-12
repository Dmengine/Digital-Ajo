import axios from "axios";
import Constants from "expo-constants";

const fallback = __DEV__ ? "http://localhost:3001/api" : "https://digital-ajo.onrender.com/api";
const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };
const baseURL = typeof extra.apiBaseUrl === "string" && extra.apiBaseUrl.trim() ? extra.apiBaseUrl.trim() : fallback;

export const apiBaseUrl = baseURL;
export const getSocketBaseUrl = () => apiBaseUrl.replace(/\/api\/?$/, "");

let token: string | null = null;

export const setApiToken = (value: string | null) => {
  token = value;
};

export const api = axios.create({
  baseURL,
  timeout: 20000,
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
