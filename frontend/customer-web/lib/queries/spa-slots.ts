import { skipToken, useQuery } from "@tanstack/react-query";
import { getSpaSlots, type GetSpaSlotsParams } from "@/lib/api/endpoints/appointments";

export const spaSlotKeys = {
  all: ["spa-slots"] as const,
  list: (params: GetSpaSlotsParams | null) => ["spa-slots", params] as const,
};

// params là null khi chưa đủ dữ liệu để hỏi mốc giờ: không gọi API.
export function useSpaSlots(params: GetSpaSlotsParams | null) {
  return useQuery({
    queryKey: spaSlotKeys.list(params),
    queryFn: params === null ? skipToken : () => getSpaSlots(params),
  });
}
