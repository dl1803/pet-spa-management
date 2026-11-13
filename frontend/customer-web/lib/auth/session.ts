import { isAxiosError } from "axios";
import { logoutSession, refreshSession } from "@/lib/api/endpoints/auth";
import { apiClient, setAccessTokenProvider } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { ROUTES, SESSION_EXPIRED_PARAM, SESSION_EXPIRED_VALUE, withQuery } from "@/lib/routes";

declare module "axios" {
  interface AxiosRequestConfig {
    // true: không làm mới phiên khi gặp 401 (lời gọi /api/session/*, lời gọi ẩn danh, lần gửi lại sau khi làm mới).
    skipAuthRefresh?: boolean;
  }
}

// Access token chỉ nằm trong bộ nhớ, mất khi tải lại trang.
let accessToken: string | null = null;
let isExpiring = false;

setAccessTokenProvider(() => accessToken);

export function setAccessToken(token: string) {
  accessToken = token;
  isExpiring = false;
}

export function hasAccessToken() {
  return accessToken !== null;
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && typeof navigator.locks?.request === "function") {
    return navigator.locks.request("ps_customer_session_refresh", task);
  }
  return task();
}

let refreshing: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  refreshing ??= withRefreshLock(() =>
    refreshSession().then(({ accessToken: token }) => {
      setAccessToken(token);
      return token;
    }),
  ).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// Hết phiên: xóa cookie ở máy chủ rồi tải hẳn trang đăng nhập. Tải cứng xóa luôn access token và bộ đệm TanStack Query.
export async function expireSession() {
  if (isExpiring) return;
  isExpiring = true;
  try {
    await logoutSession();
  } catch {
    // Lỗi mạng: vẫn chuyển về đăng nhập.
  }
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.replace(withQuery(ROUTES.login, { next, [SESSION_EXPIRED_PARAM]: SESSION_EXPIRED_VALUE }));
}

// Interceptor chạy sau interceptor chuẩn hóa lỗi của client.ts nên nhận ApiError; cấu hình gốc nằm ở `cause`.
apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  const apiError = toApiError(error);
  const config = isAxiosError(apiError.cause) ? apiError.cause.config : undefined;
  if (apiError.status !== 401 || config === undefined || config.skipAuthRefresh) throw apiError;

  try {
    await refreshAccessToken();
  } catch (refreshError) {
    const refreshApiError = toApiError(refreshError);
    if (refreshApiError.status === 401) void expireSession();
    throw refreshApiError;
  }
  // Gửi lại đúng một lần với token mới (Bearer được interceptor yêu cầu gắn lại).
  return apiClient({ ...config, skipAuthRefresh: true });
});

