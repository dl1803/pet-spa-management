"use client";

import axios from "axios";
import { ApiError, toApiError } from "./errors";

type AccessTokenProvider = () => string | null;

let getAccessToken: AccessTokenProvider = () => null;

function assertBrowser() {
  if (typeof window === "undefined") {
    throw new Error("apiClient chỉ được sử dụng trong trình duyệt.");
  }
}

export function setAccessTokenProvider(provider: AccessTokenProvider) {
  assertBrowser();
  getAccessToken = provider;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  assertBrowser();
  // Thiếu cấu hình phải dừng trước request, tránh gửi nhầm về origin của frontend.
  if (!config.baseURL?.trim()) {
    throw new ApiError({ kind: "configuration", detail: "Thiếu NEXT_PUBLIC_API_BASE_URL. Hãy cấu hình URL backend trong .env.local và khởi động lại ứng dụng." });
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
