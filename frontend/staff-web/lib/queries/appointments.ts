import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHotelAppointment,
  createSpaAppointment,
  getAppointment,
  listAppointments,
  type ListAppointmentsParams,
} from "@/lib/api/endpoints/appointments";
import { toApiError } from "@/lib/api/errors";
import { hotelKeys } from "@/lib/queries/hotel";
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

