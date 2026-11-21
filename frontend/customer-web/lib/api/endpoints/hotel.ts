import { apiClient } from "@/lib/api/client";
import type { HotelAvailability, HotelPricing } from "@/lib/api/types";

export type GetHotelAvailabilityParams = {
  petId: string;
  from: string;
  to: string;
};

export async function getHotelAvailability(params: GetHotelAvailabilityParams) {
  const { data } = await apiClient.get<HotelAvailability>("/hotel/availability", { params });
  return data;
}

export async function getHotelPricing() {
  const { data } = await apiClient.get<HotelPricing>("/hotel/pricing");
  return data;
}
