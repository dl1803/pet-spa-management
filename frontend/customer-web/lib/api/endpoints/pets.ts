import { apiClient } from "@/lib/api/client";
import type { Pet, PetPage, PetRequest, PetSizeResult } from "@/lib/api/types";

export type ListPetsParams = {
  page?: number;
  pageSize?: number;
};

export type UpdatePetVariables = {
  petId: string;
  request: PetRequest;
};

// GET /pets: danh sách hồ sơ thú cưng đang hoạt động của khách hàng hiện tại.
export async function listPets(params: ListPetsParams) {
  const { data } = await apiClient.get<PetPage>("/pets", { params });
  return data;
}

// GET /pets/{id}: chi tiết một hồ sơ thú cưng.
export async function getPet(petId: string) {
  const { data } = await apiClient.get<Pet>(`/pets/${encodeURIComponent(petId)}`);
  return data;
}

// POST /pets: tạo mới hồ sơ thú cưng (backend trả về petId và nhóm kích cỡ).
export async function createPet(request: PetRequest) {
  const { data } = await apiClient.post<PetSizeResult>("/pets", request);
  return data;
}

// PUT /pets/{id}: cập nhật hồ sơ thú cưng (backend trả về nhóm kích cỡ mới).
export async function updatePet({ petId, request }: UpdatePetVariables) {
  const { data } = await apiClient.put<PetSizeResult>(`/pets/${encodeURIComponent(petId)}`, request);
  return data;
}

// DELETE /pets/{id}: gỡ hồ sơ thú cưng (204 không nội dung).
export async function deletePet(petId: string): Promise<void> {
  await apiClient.delete(`/pets/${encodeURIComponent(petId)}`);
}
