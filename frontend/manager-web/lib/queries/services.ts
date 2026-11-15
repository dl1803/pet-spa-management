import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createService, listServices, setServiceStatus, updateService } from "@/lib/api/endpoints/services";
import type { ServiceRequest } from "@/lib/api/types";

export const serviceKeys = {
  all: ["services"] as const,
  list: () => ["services", "list"] as const,
};

export function useServices() {
  return useQuery({ queryKey: serviceKeys.list(), queryFn: listServices });
}

// Làm mới danh sách từ server trước khi mutation báo xong, kể cả khi lỗi (409/404 nghĩa là dữ liệu đã đổi),
// để màn hình luôn hiển thị kết quả server (Frontend-Architecture 5.1).
function useRefreshServices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: serviceKeys.all, refetchType: "all" });
}

export function useCreateService() {
  const refreshServices = useRefreshServices();
  return useMutation({
    mutationFn: (request: ServiceRequest) => createService(request),
    onSettled: refreshServices,
  });
}

export function useUpdateService() {
  const refreshServices = useRefreshServices();
  return useMutation({
    mutationFn: (params: { serviceId: string; request: ServiceRequest }) => updateService(params.serviceId, params.request),
    onSettled: refreshServices,
  });
}

export function useSetServiceStatus() {
  const refreshServices = useRefreshServices();
  return useMutation({
    mutationFn: (params: { serviceId: string; isActive: boolean }) => setServiceStatus(params.serviceId, params.isActive),
    onSettled: refreshServices,
  });
}
