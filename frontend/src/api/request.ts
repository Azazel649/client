import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 15000);
const TOKEN_KEY = "intelligent_mes_token";

export const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      window.localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    const message = error.response?.data?.detail ?? error.message ?? "请求失败";
    return Promise.reject(new Error(message));
  },
);

export function saveToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}
