import { apiClient } from "@/lib/api/client";
import type { CustomerPage, WalkInCreated, WalkInRequest } from "@/lib/api/types";

export type ListCustomersParams = {
  search?: string;
  page?: number;
  pageSize?: number;
};

// GET /customers: lễ tân tìm khách theo một phần số điện thoại, sắp theo họ tên (openapi listCustomers).
export async function listCustomers(params: ListCustomersParams = {}) {
  const { data } = await apiClient.get<CustomerPage>("/customers", { params });
  return data;
}

// POST /customers/walk-in: ghi nhận khách vãng lai chỉ với họ tên và số điện thoại (openapi createWalkInCustomer).
export async function createWalkInCustomer(request: WalkInRequest) {
  const { data } = await apiClient.post<WalkInCreated>("/customers/walk-in", request);
  return data;
}
