import axios from "axios";
import { toApiError } from "@/lib/api/errors";
import type { LoginRequest, SessionLoginResponse, SessionRefreshResponse } from "@/lib/api/types";
import { SESSION_API_BASE } from "./constants";

// Gọi route handler phiên của chính web này (cùng origin, cookie tự gửi kèm). Không đi qua apiClient vì không gọi backend
// và không mang Bearer token.
const sessionClient = axios.create({
  baseURL: SESSION_API_BASE,
  headers: { "Content-Type": "application/json" },
});

sessionClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

export async function requestLogin(request: LoginRequest) {
  const { data } = await sessionClient.post<SessionLoginResponse>("/login", request);
  return data;
}

// Gộp mọi lời gọi đồng thời thành một: lời gọi sau dùng lại kết quả của lời gọi đang chạy.
export function singleFlight<T>(task: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;
  return () => {
    inFlight ??= task().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && typeof navigator.locks?.request === "function") {
    return navigator.locks.request("ps_manager_session_refresh", task);
  }
  return task();
}

let cachedSessionToken: { token: string; timestamp: number } | null = null;

function getSyncChannel() {
  if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    try {
      return new BroadcastChannel("ps_manager_session_sync");
    } catch {
      return null;
    }
  }
  return null;
}

const syncChannel = getSyncChannel();
if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (typeof event.data?.token === "string") {
      cachedSessionToken = { token: event.data.token, timestamp: Date.now() };
    }
  };
}

// Refresh token xoay vòng: gửi hai lần cùng một token sẽ bị backend coi là bị lộ và thu hồi cả phiên.
// Kết hợp singleFlight trong tab, Web Lock giữa các tab và đồng bộ qua BroadcastChannel để tránh thundering herd.
export const refreshAccessToken = singleFlight(() =>
  withRefreshLock(async () => {
    if (cachedSessionToken && Date.now() - cachedSessionToken.timestamp < 5000) {
      return cachedSessionToken.token;
    }
    const { data } = await sessionClient.post<SessionRefreshResponse>("/refresh");
    cachedSessionToken = { token: data.accessToken, timestamp: Date.now() };
    try {
      syncChannel?.postMessage({ token: data.accessToken });
    } catch {
      // Bỏ qua lỗi postMessage nếu có
    }
    return data.accessToken;
  }),
);

export async function requestLogout(accessToken?: string | null) {
  cachedSessionToken = null;
  await sessionClient.post(
    "/logout",
    {},
    accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  );
}
