import { apiClient } from "@/lib/api/client";
import type { DeactivateResult, StaffCreated, StaffCreateRequest, StaffPage, StaffUpdateRequest } from "@/lib/api/types";

// Chỉ khai báo tham số màn đang dùng (openapi Page, PageSize).
export type ListStaffParams = {
  page?: number;
  pageSize?: number;
};

// GET /staff (listStaff): chỉ Quản lý; gồm cả tài khoản đã vô hiệu hóa, sắp theo họ tên.
export async function listStaff(params: ListStaffParams) {
  const { data } = await apiClient.get<StaffPage>("/staff", { params });
  return data;
}

// POST /staff (createStaff): 201 { staffId }; 409 DUPLICATE_CONTACT khi số điện thoại đã được dùng.
export async function createStaff(request: StaffCreateRequest) {
  const { data } = await apiClient.post<StaffCreated>("/staff", request);
  return data;
}

// PUT /staff/{id} (updateStaff): chỉ đổi họ tên và vai trò; backend trả 200 không nội dung.
export async function updateStaff(staffId: string, request: StaffUpdateRequest): Promise<void> {
  await apiClient.put(`/staff/${encodeURIComponent(staffId)}`, request);
}

// POST /staff/{id}/deactivate (deactivateStaff): không có body; 200 { returnedToPending } (BR-27).
export async function deactivateStaff(staffId: string) {
  const { data } = await apiClient.post<DeactivateResult>(`/staff/${encodeURIComponent(staffId)}/deactivate`);
  return data;
}
