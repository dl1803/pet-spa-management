import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmAppointment,
  getHotelSuggestions,
  getSuggestions,
  listAppointments,
  rejectAppointment,
  type ListAppointmentsParams,
} from "@/lib/api/endpoints/appointments";
import type { ConfirmHotelRequest, ConfirmSpaRequest } from "@/lib/api/types";

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: ListAppointmentsParams) => ["appointments", "list", params] as const,
  suggestions: (appointmentId: string) => ["appointments", "detail", appointmentId, "suggestions"] as const,
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

// MW-04 vùng 5: đề xuất nhân viên spa của một lịch Chờ xác nhận.
export function useSpaSuggestions(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.suggestions(appointmentId),
    queryFn: () => getSuggestions(appointmentId),
  });
}

// MW-04 vùng 8: đề xuất chuồng của một lịch lưu trú Chờ xác nhận. Cùng khóa với đề xuất spa vì cùng một đường dẫn và một mã lịch chỉ thuộc một loại.
export function useHotelSuggestions(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.suggestions(appointmentId),
    queryFn: () => getHotelSuggestions(appointmentId),
  });
}

// Tải lại danh sách và đề xuất từ server (Frontend-Architecture 5.1: sau xác nhận, từ chối và sau lỗi 409).
export function useRefreshAppointments() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: appointmentKeys.all, refetchType: "all" });
}

// Tải lại chạy nền, không chờ: lịch vừa xử lý không còn Chờ xác nhận nên đề xuất của nó có thể trả 409,
// màn không được đứng chờ kết quả đó mới báo thành công.
export function useConfirmAppointment() {
  const refreshAppointments = useRefreshAppointments();
  return useMutation({
    mutationFn: (params: { appointmentId: string; request: ConfirmSpaRequest | ConfirmHotelRequest }) =>
      confirmAppointment(params.appointmentId, params.request),
    onSettled: () => {
      void refreshAppointments();
    },
  });
}

export function useRejectAppointment() {
  const refreshAppointments = useRefreshAppointments();
  return useMutation({
    mutationFn: (appointmentId: string) => rejectAppointment(appointmentId),
    onSettled: () => {
      void refreshAppointments();
    },
  });
}
