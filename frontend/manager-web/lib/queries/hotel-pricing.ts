import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHotelPricing, updateHotelPricing } from "@/lib/api/endpoints/hotel-pricing";
import type { HotelPricing } from "@/lib/api/types";

export const hotelPricingKeys = {
  all: ["hotel-pricing"] as const,
};

export function useHotelPricing() {
  return useQuery({ queryKey: hotelPricingKeys.all, queryFn: getHotelPricing });
}

// Làm mới giá từ server trước khi mutation báo xong, kể cả khi lỗi, để màn hình luôn hiển thị kết quả server
// (Frontend-Architecture 5.1).
export function useUpdateHotelPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: HotelPricing) => updateHotelPricing(request),
    onSettled: () => queryClient.invalidateQueries({ queryKey: hotelPricingKeys.all, refetchType: "all" }),
  });
}
