import { apiClient } from "@/lib/api/client";
import type { Pet, PetPage, PetRequest, PetSizeResult } from "@/lib/api/types";

// Lễ tân bắt buộc kèm customerId; thiếu thì backend trả 400.
export type ListPetsParams = {
  customerId: string;
  page?: number;
  pageSize?: number;
};

export type UpdatePetVariables = {
  petId: string;
  request: PetRequest;
};

// GET /pets: thú cưng còn hoạt động của một khách (openapi listPets).
export async function listPets(params: ListPetsParams) {
  const { data } = await apiClient.get<PetPage>("/pets", { params });
  return data;
}

// GET /pets/{id} (openapi getPet). Lễ tân nhận cả hồ sơ đã gỡ (isActive = false); nơi gọi phải tự kiểm tra.
export async function getPet(petId: string) {
  const { data } = await apiClient.get<Pet>(`/pets/${encodeURIComponent(petId)}`);
  return data;
}

// POST /pets: lễ tân phải kèm customerId trong request (openapi createPet).
export async function createPet(request: PetRequest) {
  const { data } = await apiClient.post<PetSizeResult>("/pets", request);
  return data;
}

// PUT /pets/{id}: backend bỏ qua customerId trong request khi sửa (openapi updatePet).
export async function updatePet({ petId, request }: UpdatePetVariables) {
  const { data } = await apiClient.put<PetSizeResult>(`/pets/${encodeURIComponent(petId)}`, request);
  return data;
}
