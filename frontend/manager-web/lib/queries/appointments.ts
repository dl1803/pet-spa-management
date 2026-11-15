import { useQuery } from "@tanstack/react-query";
import { listAppointments, type ListAppointmentsParams } from "@/lib/api/endpoints/appointments";

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: ListAppointmentsParams) => ["appointments", "list", params] as const,
};

// MW-04 vùng 2: tối đa 50 lịch Chờ xác nhận một lần (UI-Screens), không phân trang trên giao diện.
export const PENDING_PAGE_SIZE = 50;

const PENDING_PARAMS: ListAppointmentsParams = { status: "Pending", page: 1, pageSize: PENDING_PAGE_SIZE };

export function usePendingAppointments() {
  return useQuery({
    queryKey: appointmentKeys.list(PENDING_PARAMS),
    queryFn: () => listAppointments(PENDING_PARAMS),
  });
}
