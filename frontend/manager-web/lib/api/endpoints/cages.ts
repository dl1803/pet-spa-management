import { apiClient } from "@/lib/api/client";
import type {
  ActiveToggleRequest,
  CageCreated,
  CageCreateRequest,
  CagePage,
  CageUpdateRequest,
} from "@/lib/api/types";

export type ListCagesParams = {
  page?: number;
  pageSize?: number;
};

// GET /cages (listCages): Lễ tân và Quản lý xem danh sách chuồng kèm tình trạng trống / đang chứa (BR-21).
export async function listCages(params: ListCagesParams = {}) {
  const { data } = await apiClient.get<CagePage>("/cages", { params });
  return data;
}

// POST /cages (createCage): chỉ Quản lý; 201 { cageId }; 409 DUPLICATE_CAGE_CODE khi trùng mã.
export async function createCage(request: CageCreateRequest) {
  const { data } = await apiClient.post<CageCreated>("/cages", request);
  return data;
}

// PUT /cages/{id} (updateCage): chỉ Quản lý; 200 không có body; 404 NOT_FOUND; 409 DUPLICATE_CAGE_CODE.
export async function updateCage(cageId: string, request: CageUpdateRequest): Promise<void> {
  await apiClient.put(`/cages/${encodeURIComponent(cageId)}`, request);
}

// PATCH /cages/{id}/status (setCageStatus): chỉ Quản lý; ngừng / mở lại sử dụng chuồng; 204 không có body; 404 NOT_FOUND.
export async function setCageStatus(cageId: string, isActive: boolean): Promise<void> {
  const body: ActiveToggleRequest = { isActive };
  await apiClient.patch(`/cages/${encodeURIComponent(cageId)}/status`, body);
}
