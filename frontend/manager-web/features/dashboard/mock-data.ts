// features/dashboard/mock-data.ts
import {
  MOCK_BUFFER_MINUTES,
  MOCK_CAGES,
  MOCK_HOTEL_APPOINTMENTS,
  MOCK_NOW,
  MOCK_PENDING_COUNTS,
  MOCK_SHIFTS,
  MOCK_SPA_TODAY,
  MOCK_STAFF,
  MOCK_UNPAID_PAYMENTS,
} from "@/lib/mock-shop-day";
import type { DashboardSnapshot } from "@/features/dashboard/overview";

// Dữ liệu mô phỏng của MW-02 theo UI demo; ghép từ dữ liệu một ngày dùng chung với MW-05. Chưa gọi API.
export const MOCK_DASHBOARD: DashboardSnapshot = {
  now: MOCK_NOW,
  bufferMinutes: MOCK_BUFFER_MINUTES,
  staff: MOCK_STAFF,
  shifts: MOCK_SHIFTS,
  pendingCounts: MOCK_PENDING_COUNTS,
  spaToday: MOCK_SPA_TODAY,
  hotelAppointments: MOCK_HOTEL_APPOINTMENTS,
  cages: MOCK_CAGES,
  unpaidPayments: MOCK_UNPAID_PAYMENTS,
};
