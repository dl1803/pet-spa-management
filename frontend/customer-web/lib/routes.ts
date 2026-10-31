export const ROUTES = {
  home: "/",
  pets: "/thu-cung",
  petCreate: "/thu-cung/them",
  spaBooking: "/dat-lich/spa",
  hotelBooking: "/dat-lich/luu-tru",
  appointments: "/lich-hen",
  history: "/lich-su",
  notifications: "/thong-bao",
  profile: "/ho-so",
  login: "/dang-nhap",
  register: "/dang-ky",
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
