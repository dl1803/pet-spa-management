import { apiClient } from "@/lib/api/client";
import type { LoginRequest, RegisterRequest, RegisterResponse } from "@/lib/api/types";
import { SESSION_API } from "@/lib/auth/config";
import type { SessionLoginResponse, SessionRefreshResponse } from "@/lib/auth/types";

// Lời gọi tới route handler của chính web này (cùng origin), không đi tới backend.
const SAME_ORIGIN = { baseURL: "", skipAuthRefresh: true } as const;

export async function register(request: RegisterRequest) {
  const { data } = await apiClient.post<RegisterResponse>("/auth/register", request, { skipAuthRefresh: true });
  return data;
}

export async function loginSession(request: LoginRequest) {
  const { data } = await apiClient.post<SessionLoginResponse>(SESSION_API.login, request, SAME_ORIGIN);
  return data;
}

export async function refreshSession() {
  const { data } = await apiClient.post<SessionRefreshResponse>(SESSION_API.refresh, undefined, SAME_ORIGIN);
  return data;
}

export async function logoutSession(): Promise<void> {
  await apiClient.post(SESSION_API.logout, undefined, SAME_ORIGIN);
}

