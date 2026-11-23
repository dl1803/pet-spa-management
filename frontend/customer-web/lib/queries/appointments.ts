import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelAppointment,
  createHotelAppointment,
  createSpaAppointment,
  getAppointment,
  listAppointments,
} from "@/lib/api/endpoints/appointments";
import type { Appointment, AppointmentStatus, HotelBookingRequest, SpaBookingRequest } from "@/lib/api/types";
import { hotelKeys } from "@/lib/queries/hotel";
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

// GET /appointments/{appointmentId}. appointmentId là null, undefined hoặc rỗng thì không tải (dùng cho thẻ lịch không cần chi tiết).
export function useAppointment(appointmentId: string | null | undefined) {
  const isValidId = typeof appointmentId === "string" && appointmentId.trim().length > 0;
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId ?? ""),
    queryFn: isValidId ? () => getAppointment(appointmentId) : skipToken,
  });
}

// POST /appointments/{appointmentId}/cancel.
// Tải lại dữ liệu cả khi lỗi, vì 409 nghĩa là lịch hẹn đã thay đổi.
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
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

// POST /appointments/hotel. Tải lại chỗ trống khi hoàn tất (cả khi lỗi 409 NO_CAPACITY) và tải lại danh sách lịch hẹn khi thành công.
// Không trả Promise để màn hình xử lý kết quả ngay, không chờ tải lại xong.
export function useCreateHotelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: HotelBookingRequest) => createHotelAppointment(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: hotelKeys.availabilityAll });
    },
  });
}
