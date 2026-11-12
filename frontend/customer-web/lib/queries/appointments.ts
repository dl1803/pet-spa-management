import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mockCancelAppointment, mockGetAppointment } from "@/lib/mock-appointments";

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

