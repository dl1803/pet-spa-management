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

// Dữ liệu mô phỏng theo UI demo (MW-02). Còn dùng cho các khối chưa nối API (lịch lưu trú, chuồng, khoản chưa thanh toán) và làm dữ liệu mẫu cho test.
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
