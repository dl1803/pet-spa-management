import { ApiError } from "@/lib/api/errors";
import type { AppointmentDetail, StatusResult } from "@/lib/api/types";
import { CHANGE_WINDOW_CLOSED_MESSAGE, canSelfChangeOrCancel } from "@/lib/appointments";
import { MOCK_APPOINTMENTS } from "@/lib/mock-data";

// Dữ liệu giả cho chi tiết, hủy và đổi lịch hẹn, đóng vai server.
// Chờ nối API thật: GET /appointments/{appointmentId}, POST /appointments/{appointmentId}/cancel, PUT /appointments/{appointmentId}.
// Lịch hẹn giữ trong bộ nhớ trình duyệt; tải lại trang thì trở về dữ liệu ban đầu.
//
// Mở chi tiết:
//   FOREIGN_APPOINTMENT_ID -> 403 FORBIDDEN · mã không tồn tại -> 404 NOT_FOUND.
// Hủy hoặc đổi lịch:
//   WINDOW_CLOSED_APPOINTMENT_ID -> 409 CHANGE_WINDOW_CLOSED (mô phỏng quá thời hạn tự đổi/hủy, không gắn với số giờ cụ thể)
//   Lịch không ở Chờ xác nhận / Đã xác nhận -> 409 INVALID_TRANSITION.
//   Lịch còn lại -> thành công: hủy thì sang Đã hủy; đổi thì về Chờ xác nhận và bỏ phân công.

const MOCK_DELAY_MS = 600;

export const FOREIGN_APPOINTMENT_ID = "f0000000-0000-4000-8000-0000000000ff";
export const WINDOW_CLOSED_APPOINTMENT_ID = "6e2b9d84-0000-4000-8000-000000000013";

let appointments: AppointmentDetail[] = MOCK_APPOINTMENTS.map((appointment) => ({ ...appointment }));
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

// Dành cho useSyncExternalStore ở danh sách lịch hẹn. Mảng chỉ được thay bằng mảng mới, không sửa tại chỗ.
export function subscribeMockAppointments(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMockAppointmentsSnapshot(): AppointmentDetail[] {
  return appointments;
}

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function notFound() {
  return new ApiError({
    kind: "http",
    status: 404,
    code: "NOT_FOUND",
    title: "Không tìm thấy dữ liệu",
    detail: "Không tìm thấy dữ liệu, có thể đã bị thay đổi.",
  });
}

function forbidden() {
  return new ApiError({
    kind: "http",
    status: 403,
    code: "FORBIDDEN",
    title: "Không có quyền",
    detail: "Bạn không có quyền thực hiện thao tác này.",
  });
}

function windowClosed() {
  return new ApiError({
    kind: "http",
    status: 409,
    code: "CHANGE_WINDOW_CLOSED",
    title: "Đã quá thời hạn tự đổi/hủy",
    detail: CHANGE_WINDOW_CLOSED_MESSAGE,
  });
}

function invalidTransition() {
  return new ApiError({
    kind: "http",
    status: 409,
    code: "INVALID_TRANSITION",
    title: "Trạng thái không hợp lệ",
    detail: "Lịch hẹn đã thay đổi trạng thái, vui lòng tải lại trang.",
  });
}

export async function mockGetAppointment(appointmentId: string): Promise<AppointmentDetail> {
  await wait();
  if (appointmentId === FOREIGN_APPOINTMENT_ID) throw forbidden();
  const appointment = appointments.find((item) => item.appointmentId === appointmentId);
  if (!appointment) throw notFound();
  return { ...appointment };
}

export function getMockAppointmentForChange(appointmentId: string): AppointmentDetail {
  if (appointmentId === FOREIGN_APPOINTMENT_ID) throw forbidden();
  const appointment = appointments.find((item) => item.appointmentId === appointmentId);
  if (!appointment) throw notFound();
  if (appointment.appointmentId === WINDOW_CLOSED_APPOINTMENT_ID) throw windowClosed();
  if (!canSelfChangeOrCancel(appointment.status)) throw invalidTransition();
  return { ...appointment };
}

export function replaceMockAppointment(next: AppointmentDetail) {
  appointments = appointments.map((item) => (item.appointmentId === next.appointmentId ? next : item));
  emitChange();
}

export async function mockCancelAppointment(appointmentId: string): Promise<StatusResult> {
  await wait();
  const appointment = getMockAppointmentForChange(appointmentId);
  const now = new Date().toISOString();
  replaceMockAppointment({
    ...appointment,
    status: "Cancelled",
    cancelReason: "CustomerCancelled",
    cancelledAt: now,
    updatedAt: now,
    staff: [],
  });
  return { status: "Cancelled" };
}

