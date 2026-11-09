// features/appointments/screens/appointment-detail-screen.tsx
"use client";

// MW-05 Chi tiết lịch hẹn – UI-Screens.md. Hiện có vùng 1 (không nút thao tác) và vùng 4 (Ảnh minh chứng) của lịch spa.
// Dữ liệu mô phỏng, chưa gọi API (nối API thật ở bước sau).

import { useParams } from "next/navigation";
import { AppointmentDetailContent } from "@/features/appointments/components/appointment-detail-content";

// useParams cần trong Suspense (trang bọc ở app/(main)/lich-hen/[appointmentId]/page.tsx); phần hiển thị tách riêng để kiểm thử.
export function AppointmentDetailScreen() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  return <AppointmentDetailContent appointmentId={appointmentId} />;
}
