import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";
import { getHotelAvailability, getHotelPricing, type GetHotelAvailabilityParams } from "@/lib/api/endpoints/hotel";

export const hotelKeys = {
  availabilityAll: ["hotel", "availability"] as const,
  availability: (params: GetHotelAvailabilityParams | null) => ["hotel", "availability", params] as const,
  pricing: ["hotel", "pricing"] as const,
};

// params là null khi chưa đủ dữ liệu để hỏi chỗ trống: không gọi API.
export function useHotelAvailability(params: GetHotelAvailabilityParams | null) {
  return useQuery({
    queryKey: hotelKeys.availability(params),
    queryFn: params === null ? skipToken : () => getHotelAvailability(params),
    placeholderData: keepPreviousData,
  });
}

export function useHotelPricing() {
  return useQuery({ queryKey: hotelKeys.pricing, queryFn: getHotelPricing });
}
