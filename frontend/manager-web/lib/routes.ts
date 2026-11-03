export const ROUTES = {
  dashboard: "/",
  appointments: "/lich-hen",
  appointmentDetail: (appointmentId: string) => `/lich-hen/${encodeURIComponent(appointmentId)}`,
  pending: "/cho-xac-nhan",
  services: "/dich-vu",
  cages: "/chuong-va-gia",
  staff: "/nhan-vien",
  workShifts: "/lich-lam-viec",
  lockedCustomers: "/go-khoa-dat-lich",
  payments: "/thanh-toan",
  config: "/cau-hinh",
  profile: "/ho-so",
  login: "/dang-nhap",
} as const;

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
