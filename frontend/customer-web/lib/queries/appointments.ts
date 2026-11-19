import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSpaAppointment, getAppointment, listAppointments } from "@/lib/api/endpoints/appointments";
import type { Appointment, AppointmentStatus, SpaBookingRequest } from "@/lib/api/types";
import { mockCancelAppointment } from "@/lib/mock-appointments";
import { spaSlotKeys } from "@/lib/queries/spa-slots";

// pageSize lớn nhất backend nhận (ListAppointmentsQueryValidator: 1 đến 100).
const APPOINTMENTS_FETCH_PAGE_SIZE = 100;

export type AppointmentListFilter = {
  status?: AppointmentStatus;
  petId?: string;
};

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (filter: AppointmentListFilter) => ["appointments", "list", filter] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  payments: (appointmentId: string) => ["appointments", "detail", appointmentId, "payments"] as const,
};

// Tải lần lượt mọi trang rồi gộp. Gộp theo appointmentId để lịch mới tạo giữa hai lần tải không làm trùng dòng.
async function fetchAllAppointments(filter: AppointmentListFilter): Promise<Appointment[]> {
  const byId = new Map<string, Appointment>();
  for (let page = 1; ; page += 1) {
    const result = await listAppointments({ ...filter, page, pageSize: APPOINTMENTS_FETCH_PAGE_SIZE });
    for (const item of result.items) {
      byId.set(item.appointmentId, item);
    }
    if (result.items.length === 0 || page * APPOINTMENTS_FETCH_PAGE_SIZE >= result.total) break;
  }
  return [...byId.values()];
}

// GET /appointments. Tải đủ các trang để lọc theo nhóm trạng thái, sắp xếp theo giờ hẹn và chia trang ở web
// (UI-Screens G-06: API chỉ lọc một status mỗi lần và sắp theo ngày tạo).
export function useAppointments(filter: AppointmentListFilter = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(filter),
    queryFn: () => fetchAllAppointments(filter),
  });
}

// GET /appointments/{appointmentId}. appointmentId là null thì không tải (dùng cho thẻ lịch không cần chi tiết).
export function useAppointment(appointmentId: string | null) {
  const id = appointmentId;
  return useQuery({
    queryKey: appointmentKeys.detail(id ?? ""),
    queryFn: id === null ? skipToken : () => getAppointment(id),
  });
}

// Chờ nối API thật: cancelAppointment (POST /appointments/{appointmentId}/cancel).
// Tải lại dữ liệu cả khi lỗi, vì 409 nghĩa là lịch hẹn đã thay đổi.
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => mockCancelAppointment(appointmentId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all, refetchType: "all" }),
  });
}

// POST /appointments/spa. Tải lại mốc giờ khi hoàn tất (cả khi lỗi 409 SLOT_FULL) và tải lại danh sách lịch hẹn khi thành công.
// Không trả Promise để màn hình xử lý kết quả ngay, không chờ tải lại xong.
export function useCreateSpaAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SpaBookingRequest) => createSpaAppointment(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
    },
  });
}
