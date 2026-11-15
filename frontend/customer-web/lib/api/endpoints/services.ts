import { apiClient } from "@/lib/api/client";
import type { Service } from "@/lib/api/types";

// GET /services: dịch vụ đang cung cấp kèm giá, thời lượng theo loài và nhóm kích cỡ (mảng, không phân trang).
export async function listServices() {
  const { data } = await apiClient.get<Service[]>("/services");
  return data;
}
