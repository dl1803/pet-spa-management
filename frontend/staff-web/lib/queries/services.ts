import { useQuery } from "@tanstack/react-query";
import { listServices, type ListServicesParams } from "@/lib/api/endpoints/services";

export const serviceKeys = {
  all: ["services"] as const,
  list: (params: ListServicesParams) => ["services", "list", params] as const,
};

export function useServices(params: ListServicesParams) {
  return useQuery({ queryKey: serviceKeys.list(params), queryFn: () => listServices(params) });
}
