import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PetRequest } from "@/lib/api/types";
import { mockCreatePet, mockDeletePet, mockGetPet, mockListPets, mockUpdatePet } from "@/lib/mock-pets";

// Lấy tối đa 50 hồ sơ một lần.
export const PETS_PAGE_SIZE = 50;

export const petKeys = {
  all: ["pets"] as const,
  list: () => ["pets", "list"] as const,
  detail: (petId: string) => ["pets", "detail", petId] as const,
};

export function usePets() {
  return useQuery({
    queryKey: petKeys.list(),
    queryFn: () => mockListPets({ page: 1, pageSize: PETS_PAGE_SIZE }),
  });
}

// petId = null: không tải (màn thêm mới dùng chung màn hình với màn sửa).
export function usePet(petId: string | null) {
  return useQuery({
    queryKey: petKeys.detail(petId ?? ""),
    queryFn: () => mockGetPet(petId ?? ""),
    enabled: petId !== null,
  });
}

// Làm mới cả danh sách (kể cả khi đang ở màn khác) trước khi hook báo xong, để màn danh sách không nháy dữ liệu cũ.
function useRefreshPets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: petKeys.all, refetchType: "all" });
}

export function useCreatePet() {
  const refreshPets = useRefreshPets();
  return useMutation({
    mutationFn: (request: PetRequest) => mockCreatePet(request),
    onSuccess: refreshPets,
  });
}

export function useUpdatePet() {
  const refreshPets = useRefreshPets();
  return useMutation({
    mutationFn: (params: { petId: string; request: PetRequest }) => mockUpdatePet(params),
    onSuccess: refreshPets,
  });
}

// Tải lại danh sách cả khi lỗi 403/404.
export function useDeletePet() {
  const refreshPets = useRefreshPets();
  return useMutation({
    mutationFn: (petId: string) => mockDeletePet(petId),
    onSettled: refreshPets,
  });
}

