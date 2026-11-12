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

// Refresh token xoay vòng: gửi hai lần cùng một token sẽ bị backend coi là bị lộ và thu hồi cả phiên.
// Vì vậy mọi nơi cần làm mới (khôi phục phiên, interceptor 401, React StrictMode) dùng chung một lời gọi đang chạy.
export const refreshAccessToken = singleFlight(async () => {
  const { data } = await sessionClient.post<SessionRefreshResponse>("/refresh");
  return data.accessToken;
});

export async function requestLogout() {
  await sessionClient.post("/logout");
}
