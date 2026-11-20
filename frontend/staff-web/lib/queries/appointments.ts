import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createHotelAppointment, createSpaAppointment } from "@/lib/api/endpoints/appointments";
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
    // Lịch mới chiếm mốc giờ; mốc vừa kín (SLOT_FULL) cũng cần số liệu mới.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spaSlotKeys.all }),
    onError: (error) => {
      if (isConflictWith(error, "SLOT_FULL")) void queryClient.invalidateQueries({ queryKey: spaSlotKeys.all });
    },
  });
}

export function useCreateHotelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHotelAppointment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hotelKeys.availabilityAll }),
    onError: (error) => {
      if (isConflictWith(error, "NO_CAPACITY")) void queryClient.invalidateQueries({ queryKey: hotelKeys.availabilityAll });
    },
  });
}
