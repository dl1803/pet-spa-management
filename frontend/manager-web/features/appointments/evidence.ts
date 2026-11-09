// features/appointments/evidence.ts
import type { AppointmentDetail, Photo, PhotoKind, Species } from "@/lib/api/types";
import { MOCK_PET_SPECIES, MOCK_PHOTOS, MOCK_SPA_TODAY } from "@/lib/mock-shop-day";
import { formatDate, formatShortDate, formatTime } from "@/lib/format";

// Ảnh của một loại (Before/After) trong danh sách ảnh của lịch; mỗi loại tối đa một ảnh, nếu trùng lấy ảnh tải lên sau cùng.
export function pickPhoto(photos: Photo[], kind: PhotoKind): Photo | null {
  const matching = photos.filter((photo) => photo.kind === kind);
  if (matching.length === 0) return null;
  return matching.reduce((latest, photo) => (Date.parse(photo.uploadedAt) > Date.parse(latest.uploadedAt) ? photo : latest));
}

// “09:10, 06/10” – giờ và ngày tải ảnh theo múi giờ cửa hàng (API không trả người tải lên).
export function formatPhotoStamp(uploadedAt: string): string {
  return `${formatTime(uploadedAt)}, ${formatShortDate(uploadedAt)}`;
}

export type MockSpaAppointment = { appointment: AppointmentDetail; species: Species; photos: Photo[] };

// Dữ liệu mô phỏng của MW-05: tra lịch spa theo ID. Lịch lưu trú và ID lạ → null (MW-05 của lưu trú chưa có).
export function findMockSpaAppointment(appointmentId: string): MockSpaAppointment | null {
  const appointment = MOCK_SPA_TODAY.find((item) => item.appointmentId === appointmentId);
  if (!appointment) return null;
  return {
    appointment,
    species: MOCK_PET_SPECIES[appointment.petId] ?? "Dog",
    photos: MOCK_PHOTOS[appointment.appointmentId] ?? [],
  };
}

// Dòng mô tả dưới tiêu đề (MW-05 vùng 1): “LH-… . Khách. Thứ ba 06/10/2026, 09:00 – 11:00. Nhân viên Hạnh.”
export function describeSpaAppointment(appointment: AppointmentDetail, code: string): string {
  const parts = [code];
  if (appointment.customerName) parts.push(appointment.customerName);
  if (appointment.slotStart && appointment.slotEnd) {
    parts.push(`${formatDate(appointment.slotStart)}, ${formatTime(appointment.slotStart)} – ${formatTime(appointment.slotEnd)}`);
  }
  const names = (appointment.staff ?? []).map((item) => item.fullName).filter((name): name is string => Boolean(name));
  if (names.length > 0) parts.push(`Nhân viên ${names.map((name) => name.trim().split(/\s+/).at(-1)).join(", ")}`);
  return `${parts.join(". ")}.`;
}
