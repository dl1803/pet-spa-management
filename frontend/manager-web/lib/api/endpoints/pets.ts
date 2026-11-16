import { apiClient } from "@/lib/api/client";
import type { Pet } from "@/lib/api/types";

// GET /pets/{id} (getPet): Quản lý xem toàn cửa hàng, kể cả hồ sơ khách đã gỡ (isActive = false).
export async function getPet(petId: string) {
  const { data } = await apiClient.get<Pet>(`/pets/${encodeURIComponent(petId)}`);
  return data;
}
