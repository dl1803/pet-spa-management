export const ROUTES = {
  home: "/",
  pets: "/thu-cung",
  petCreate: "/thu-cung/them",
  petEdit: (petId: string) => `/thu-cung/${encodeURIComponent(petId)}/sua`,
  spaBooking: "/dat-lich/spa",
  hotelBooking: "/dat-lich/luu-tru",
  appointments: "/lich-hen",
  appointmentDetail: (appointmentId: string) => `/lich-hen/${encodeURIComponent(appointmentId)}`,
  appointmentChange: (appointmentId: string) => `/lich-hen/${encodeURIComponent(appointmentId)}/doi-lich`,
  history: "/lich-su",
  notifications: "/thong-bao",
  profile: "/ho-so",
  login: "/dang-nhap",
  register: "/dang-ky",
} as const;

// Tham số báo lịch hẹn đã quá hạn tự đổi/hủy: màn đổi lịch chuyển về chi tiết khi API trả 409 CHANGE_WINDOW_CLOSED.
export const WINDOW_CLOSED_PARAM = "window";
export const WINDOW_CLOSED_VALUE = "closed";

// Tham số báo phiên đã hết hạn: màn đăng nhập hiện thông báo khi có tham số này.
export const SESSION_EXPIRED_PARAM = "session";
export const SESSION_EXPIRED_VALUE = "expired";

export function withQuery(path: string, query: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function getSafeNextPath(next: string | null): string | null {
  if (next === null || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  if (next === ROUTES.login || next.startsWith(`${ROUTES.login}?`)) return null;
  if (next === ROUTES.register || next.startsWith(`${ROUTES.register}?`)) return null;
  return next;
}
