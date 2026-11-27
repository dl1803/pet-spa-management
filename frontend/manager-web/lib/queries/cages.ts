import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCage, listCages, setCageStatus, updateCage, type ListCagesParams } from "@/lib/api/endpoints/cages";
import type { CageCreateRequest, CageUpdateRequest } from "@/lib/api/types";
import { useRefreshAppointments } from "@/lib/queries/appointments";

// MW-07 vùng 4 / MW-04 vùng 8: backend nhận pageSize tối đa 100.
export const CAGE_PAGE_SIZE = 100;

const CAGE_LIST_PARAMS: ListCagesParams = { page: 1, pageSize: CAGE_PAGE_SIZE };

export const cageKeys = {
  all: ["cages"] as const,
  list: (params: ListCagesParams = CAGE_LIST_PARAMS) => ["cages", "list", params] as const,
};

export function useCages(options?: {
  enabled?: boolean;
  refetchInterval?: number;
  refetchIntervalInBackground?: boolean;
}) {
  return useQuery({
    queryKey: cageKeys.list(CAGE_LIST_PARAMS),
    queryFn: () => listCages(CAGE_LIST_PARAMS),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: options?.refetchIntervalInBackground,
  });
}

// Làm mới danh sách chuồng và lịch hẹn liên quan (đề xuất, tổng quan) từ server kể cả khi lỗi 404/409
// để màn hình luôn phản ánh đúng dữ liệu server (Frontend-Architecture 5.1).
function useRefreshCages() {
  const queryClient = useQueryClient();
  const refreshAppointments = useRefreshAppointments();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: cageKeys.all, refetchType: "all" }),
      refreshAppointments(),
    ]);
}

export function useCreateCage() {
  const refreshCages = useRefreshCages();
  return useMutation({
    mutationFn: (request: CageCreateRequest) => createCage(request),
    onSettled: refreshCages,
  });
}

export function useUpdateCage() {
  const refreshCages = useRefreshCages();
  return useMutation({
    mutationFn: (params: { cageId: string; request: CageUpdateRequest }) => updateCage(params.cageId, params.request),
    onSettled: refreshCages,
  });
}

export function useSetCageStatus() {
  const refreshCages = useRefreshCages();
  return useMutation({
    mutationFn: (params: { cageId: string; isActive: boolean }) => setCageStatus(params.cageId, params.isActive),
    onSettled: refreshCages,
  });
}
