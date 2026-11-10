export const ROUTES = {
  home: "/",
  appointments: "/lich-hen",
  appointmentExecution: (appointmentId: string) => `/lich-hen/${appointmentId}/thuc-hien`,
  customers: "/khach-hang",
  customerPetNew: (customerId: string) => `/khach-hang/${customerId}/thu-cung/them`,
  customerPetEdit: (customerId: string, petId: string) => `/khach-hang/${customerId}/thu-cung/${petId}`,
  booking: "/dat-lich",
  checkIn: "/tiep-nhan",
  cages: "/chuong",
  payments: "/thanh-toan",
  checkOut: "/tra-thu-cung",
  workHistory: "/lich-su-cong-viec",
  notifications: "/thong-bao",
  services: "/dich-vu",
  profile: "/ho-so",
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
