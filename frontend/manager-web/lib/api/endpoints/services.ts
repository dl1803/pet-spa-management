import { apiClient } from "@/lib/api/client";
import type { ActiveToggleRequest, Service, ServiceCreated, ServiceRequest } from "@/lib/api/types";

// GET /services (listServices): Quản lý nhận cả dịch vụ đã ngừng (isActive = false) để mở lại.
export async function listServices() {
  const { data } = await apiClient.get<Service[]>("/services");
  return data;
}

// POST /services (createService): 201 { serviceId }.
export async function createService(request: ServiceRequest) {
  const { data } = await apiClient.post<ServiceCreated>("/services", request);
  return data;
}

// PUT /services/{id} (updateService): body như POST; backend trả 200 không nội dung.
export async function updateService(serviceId: string, request: ServiceRequest): Promise<void> {
  await apiClient.put(`/services/${encodeURIComponent(serviceId)}`, request);
}

// PATCH /services/{id}/status (setServiceStatus): ngừng / mở lại; backend trả 204.
export async function setServiceStatus(serviceId: string, isActive: boolean): Promise<void> {
  const body: ActiveToggleRequest = { isActive };
  await apiClient.patch(`/services/${encodeURIComponent(serviceId)}/status`, body);
}
