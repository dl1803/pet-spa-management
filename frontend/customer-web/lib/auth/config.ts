import type { Role } from "@/lib/api/types";

// Khác nhau giữa các web: vai trò duy nhất được vào web này.
export const ALLOWED_ROLE: Role = "Customer";
export const ROLES: readonly string[] = ["Customer", "Staff", "Manager"];

// Cookie httpOnly giữ refresh token (7 ngày, bằng thời hạn refresh token ở backend).
export const SESSION_COOKIE_NAME = "ps_rt";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const SESSION_API = {
  login: "/api/session/login",
  refresh: "/api/session/refresh",
  logout: "/api/session/logout",
} as const;

export const WRONG_WEB_TITLE = "Tài khoản không có quyền truy cập web này";

