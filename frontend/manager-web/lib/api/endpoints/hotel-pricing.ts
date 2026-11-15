import { apiClient } from "@/lib/api/client";
import type { HotelPricing } from "@/lib/api/types";

// GET /hotel/pricing (getHotelPricing): giá theo đêm của các dòng đã lưu và phí trả muộn mỗi lần.
// Backend chỉ trả các dòng đã có trong CSDL (có thể thiếu hoặc rỗng) và lateFeePerBlock = 0 khi chưa thiết lập.
export async function getHotelPricing() {
  const { data } = await apiClient.get<HotelPricing>("/hotel/pricing");
  return data;
}

// PUT /hotel/pricing (updateHotelPricing): chỉ Quản lý; body như GET; backend trả 200 không nội dung.
export async function updateHotelPricing(request: HotelPricing): Promise<void> {
  await apiClient.put("/hotel/pricing", request);
}
