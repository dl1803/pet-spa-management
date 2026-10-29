import axios from "axios";
import { ApiError, toApiError } from "./errors";

type AccessTokenProvider = () => string | null;

let getAccessToken: AccessTokenProvider = () => null;

export function setAccessTokenProvider(provider: AccessTokenProvider) {
  getAccessToken = provider;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  // Thiếu cấu hình phải dừng trước request, tránh gửi nhầm về origin của frontend.
  if (!config.baseURL?.trim()) {
    throw new ApiError({ kind: "unknown", cause: new Error("Thiếu NEXT_PUBLIC_API_BASE_URL.") });
  }
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);
