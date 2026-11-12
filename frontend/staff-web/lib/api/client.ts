"use client";

import axios, { isAxiosError, type InternalAxiosRequestConfig } from "axios";
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

// Xử lý phiên khi API trả 401 (Frontend-Architecture 6.3). Mặc định chưa đăng ký: lỗi 401 được trả nguyên như mọi lỗi khác.
type SessionHandlers = {
  // Làm mới access token (một lời gọi dùng chung) và lưu token mới để provider trả về; ném lỗi nếu không làm mới được.
  refresh: () => Promise<void>;
  // Gọi khi backend từ chối làm mới (401): phiên đã hết, phải đăng nhập lại.
  onExpired: () => void;
};

let sessionHandlers: SessionHandlers | null = null;

export function setSessionHandlers(handlers: SessionHandlers | null) {
  assertBrowser();
  sessionHandlers = handlers;
}

type RetriableConfig = InternalAxiosRequestConfig & { sessionRetried?: boolean };

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

function shouldRefreshSession(error: unknown): error is { config: RetriableConfig } {
  if (sessionHandlers === null || !isAxiosError(error) || error.response?.status !== 401 || !error.config) return false;
  const config = error.config as RetriableConfig;
  return !config.sessionRetried && !config.url?.startsWith("/auth/");
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!shouldRefreshSession(error) || sessionHandlers === null) throw toApiError(error);
    const handlers = sessionHandlers;

    try {
      await handlers.refresh();
    } catch (refreshError) {
      const failure = toApiError(refreshError);
      if (failure.status === 401) {
        handlers.onExpired();
        throw toApiError(error);
      }
      // Lỗi tạm khi làm mới (429, 5xx, mất mạng): giữ phiên và báo đúng lỗi đó.
      throw failure;
    }

    // Gửi lại đúng một lần; request interceptor gắn access token mới từ provider.
    const retry: RetriableConfig = { ...error.config, sessionRetried: true };
    return apiClient.request(retry);
  },
);
