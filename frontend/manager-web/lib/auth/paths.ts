import { ROUTES } from "@/lib/routes";
import { LOGIN_REASON_EXPIRED } from "./constants";

// Chỉ nhận đường dẫn nội bộ: bắt đầu bằng "/", không phải "//" và không có "\" (chống chuyển hướng ra ngoài).
export function getSafeNextPath(next: string | null): string | null {
  if (next === null || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}

// Trang đích sau đăng nhập (User-Flows 4.1): ?next= hợp lệ thì dùng, không thì MW-02 Tổng quan.
export function getLandingPath(next: string | null): string {
  const safe = getSafeNextPath(next);
  // Màn đăng nhập không phải đích hợp lệ: tránh vòng lặp.
  if (safe === null || safe === ROUTES.login || safe.startsWith(`${ROUTES.login}?`) || safe.startsWith(`${ROUTES.login}/`)) {
    return ROUTES.dashboard;
  }
  return safe;
}

export function buildLoginPath(options: { next?: string | null; expired?: boolean } = {}): string {
  const params = new URLSearchParams();
  const next = getSafeNextPath(options.next ?? null);
  if (next !== null && next !== ROUTES.dashboard) params.set("next", next);
  if (options.expired) params.set("reason", LOGIN_REASON_EXPIRED);
  const query = params.toString();
  return query === "" ? ROUTES.login : `${ROUTES.login}?${query}`;
}
