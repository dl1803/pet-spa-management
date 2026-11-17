import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSpaAppointment } from "@/lib/api/endpoints/appointments";
import type { SpaBookingRequest } from "@/lib/api/types";
import { mockCancelAppointment, mockGetAppointment } from "@/lib/mock-appointments";
import { spaSlotKeys } from "@/lib/queries/spa-slots";

export const appointmentKeys = {
  all: ["appointments"] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
};

// Chờ nối API thật: getAppointment (GET /appointments/{appointmentId}).
export function useAppointment(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => mockGetAppointment(appointmentId),
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
