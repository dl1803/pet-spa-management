import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelAppointment,
  confirmAppointment,
  getAppointment,
  getHotelSuggestions,
  getSuggestions,
  listAppointments,
  listPhotos,
  rejectAppointment,
  updateAppointment,
  type ListAppointmentsParams,
} from "@/lib/api/endpoints/appointments";
import type {
  CancelRequest,
  ConfirmHotelRequest,
  ConfirmSpaRequest,
  UpdateAppointmentRequest,
} from "@/lib/api/types";

export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: ListAppointmentsParams) => ["appointments", "list", params] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  suggestions: (appointmentId: string) => ["appointments", "detail", appointmentId, "suggestions"] as const,
  photos: (appointmentId: string) => ["appointments", "detail", appointmentId, "photos"] as const,
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

// MW-05: chi tiết một lịch hẹn thật.
export function useAppointment(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId),
    queryFn: () => getAppointment(appointmentId),
  });
}

// MW-05 vùng 4: ảnh minh chứng của một lịch spa (chỉ xem). URL ảnh sống 60 phút nên không đặt staleTime dài:
// mở lại hoặc quay lại tab sẽ tải URL mới.
export function useAppointmentPhotos(appointmentId: string) {
  return useQuery({
    queryKey: appointmentKeys.photos(appointmentId),
    queryFn: () => listPhotos(appointmentId),
  });
}

// Tải lại cả khi lỗi: 404/409 nghĩa là lịch đã đổi (Frontend-Architecture 5.1).
export function useUpdateAppointment() {
  const refreshAppointments = useRefreshAppointments();
  return useMutation({
    mutationFn: (params: { appointmentId: string; request: UpdateAppointmentRequest }) =>
      updateAppointment(params.appointmentId, params.request),
    onSettled: () => {
      void refreshAppointments();
    },
  });
}

export function useCancelAppointment() {
  const refreshAppointments = useRefreshAppointments();
  return useMutation({
    mutationFn: (params: { appointmentId: string; request: CancelRequest }) =>
      cancelAppointment(params.appointmentId, params.request),
    onSettled: () => {
      void refreshAppointments();
    },
  });
}

