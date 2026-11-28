import { skipToken, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  checkInAppointment,
  completeAppointment,
  createHotelAppointment,
  createSpaAppointment,
  getAppointment,
  listAppointments,
  listPhotos,
  markServiceDone,
  respondCostConfirmation,
  startAppointment,
  uploadPhoto,
  weightCheckAppointment,
  type ListAppointmentsParams,
} from "@/lib/api/endpoints/appointments";
import { toApiError } from "@/lib/api/errors";
import { hotelKeys } from "@/lib/queries/hotel";
import {
  forgetPendingCostConfirmation,
  rememberPendingCostConfirmation,
} from "@/lib/queries/pending-cost-confirmation";
import { invalidatePets } from "@/lib/queries/pets";
import { spaSlotKeys } from "@/lib/queries/spa-slots";

function isConflictWith(error: unknown, code: string) {
  const apiError = toApiError(error);
  return apiError.status === 409 && apiError.code === code;
}

export function useCreateSpaAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSpaAppointment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spaSlotKeys.all }),
    onError: (error) => {
      if (isConflictWith(error, "SLOT_FULL")) {
        return queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
      }
    },
  });
}

export function useCreateHotelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHotelAppointment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hotelKeys.availabilityAll }),
    onError: (error) => {
      if (isConflictWith(error, "NO_CAPACITY")) {
        return queryClient.invalidateQueries({ queryKey: hotelKeys.availabilityAll });
      }
    },
  });
}

// Cùng hình dạng khóa với customer-web và manager-web.
export const appointmentKeys = {
  all: ["appointments"] as const,
  list: (params: ListAppointmentsParams) => ["appointments", "list", params] as const,
  detail: (appointmentId: string) => ["appointments", "detail", appointmentId] as const,
  photos: (appointmentId: string) => ["appointments", "detail", appointmentId, "photos"] as const,
};

type PollingOptions = {
  // Mili giây; chỉ chạy khi tab đang hiển thị (mặc định refetchIntervalInBackground = false).
  refetchInterval?: number;
};

export function useAppointments(params: ListAppointmentsParams, options: PollingOptions = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: () => listAppointments(params),
    refetchInterval: options.refetchInterval,
  });
}

// appointmentId là null, undefined hoặc rỗng thì không tải.
export function useAppointment(appointmentId: string | null | undefined, options: PollingOptions = {}) {
  const isValidId = typeof appointmentId === "string" && appointmentId.trim().length > 0;
  return useQuery({
    queryKey: appointmentKeys.detail(appointmentId ?? ""),
    queryFn: isValidId ? () => getAppointment(appointmentId) : skipToken,
    refetchInterval: options.refetchInterval,
  });
}

// appointmentId là null, undefined hoặc rỗng thì không tải.
export function useAppointmentPhotos(appointmentId: string | null | undefined) {
  const isValidId = typeof appointmentId === "string" && appointmentId.trim().length > 0;
  return useQuery({
    queryKey: appointmentKeys.photos(appointmentId ?? ""),
    queryFn: isValidId ? () => listPhotos(appointmentId) : skipToken,
  });
}

// Làm mới danh sách và chi tiết (gồm ảnh) sau khi đổi trạng thái hoặc tiến độ; trả về Promise để thao tác chỉ xong khi dữ liệu mới đã về.
function refreshAppointments(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
}

export function useStartAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startAppointment,
    onSettled: () => refreshAppointments(queryClient),
  });
}

export function useMarkServiceDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markServiceDone,
    onSettled: () => refreshAppointments(queryClient),
  });
}

export function useCompleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeAppointment,
    onSettled: () => refreshAppointments(queryClient),
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadPhoto,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.photos(variables.appointmentId) });
      void refreshAppointments(queryClient);
    },
    onError: (error, variables) => {
      // Lịch đổi trạng thái hoặc ngoài phạm vi: tải lại chi tiết (gồm ảnh) để màn khớp dữ liệu mới nhất.
      const status = toApiError(error).status;
      if (status === 409 || status === 403 || status === 404) {
        return queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(variables.appointmentId) });
      }
    },
  });
}

// Sau tiếp nhận, đối chiếu cân nặng hay phản hồi chi phí: lịch và hồ sơ thú cưng (cân nặng, nhóm kích cỡ) có thể đã đổi nên làm mới cả hai.
function refreshCheckInData(queryClient: QueryClient) {
  return Promise.all([refreshAppointments(queryClient), invalidatePets(queryClient)]);
}

// Ghi nhớ yêu cầu xác nhận trong onSuccess (chạy trước onSettled) để lần tải lại ngay sau đó đã thấy yêu cầu.
export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkInAppointment,
    onSuccess: (result, variables) => {
      if (result.weightCheck) {
        rememberPendingCostConfirmation(variables.appointmentId, variables.request.actualWeightKg, result.weightCheck);
      }
    },
    onSettled: () => refreshCheckInData(queryClient),
  });
}

export function useWeightCheckAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: weightCheckAppointment,
    onSuccess: (result, variables) => {
      rememberPendingCostConfirmation(variables.appointmentId, variables.request.actualWeightKg, result.weightCheck);
    },
    onSettled: () => refreshCheckInData(queryClient),
  });
}

export function useRespondCostConfirmation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: respondCostConfirmation,
    onSettled: async (_result, error, variables) => {
      await refreshCheckInData(queryClient);
      const apiError = error === null ? null : toApiError(error);
      // Thành công, 404 hoặc quá hạn: không còn yêu cầu đang chờ hợp lệ.
      if (
        apiError === null ||
        apiError.status === 404 ||
        (apiError.status === 409 && apiError.code === "COST_CONFIRMATION_EXPIRED")
      ) {
        forgetPendingCostConfirmation(variables.appointmentId);
      }
    },
  });
}

