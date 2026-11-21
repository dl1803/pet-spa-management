import { apiClient } from "@/lib/api/client";
import type { Service, SizeGroup, Species } from "@/lib/api/types";

export type ListServicesParams = {
  species?: Species;
  sizeGroup?: SizeGroup;
};

export async function listServices(params: ListServicesParams = {}) {
  const { data } = await apiClient.get<Service[]>("/services", { params });
  return data;
}
