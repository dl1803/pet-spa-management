import { skipToken, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toApiError } from "@/lib/api/errors";
import { createPet, getPet, listPets, updatePet } from "@/lib/api/endpoints/pets";

// Một khách có rất ít thú cưng: lấy tối đa một trang, không phân trang trên giao diện.
export const PETS_PAGE_SIZE = 100;

export const petKeys = {
  all: ["pets"] as const,
  list: (customerId: string) => ["pets", "list", customerId] as const,
  detail: (petId: string | null) => ["pets", "detail", petId] as const,
};

// Đợi làm mới cả các query đang ẩn (danh sách ở /khach-hang và chi tiết) trước khi chuyển trang.
export function invalidatePets(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: petKeys.all, refetchType: "all" });
}

export function usePets(customerId: string) {
  return useQuery({
    queryKey: petKeys.list(customerId),
    queryFn: () => listPets({ customerId, page: 1, pageSize: PETS_PAGE_SIZE }),
  });
}

// petId = null: chưa đủ điều kiện tải (không gọi API).
export function usePet(petId: string | null) {
  const id = petId;
  return useQuery({
    queryKey: petKeys.detail(id),
    queryFn: id === null ? skipToken : () => getPet(id),
  });
}

export function useCreatePet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPet,
    onSuccess: () => invalidatePets(queryClient),
  });
}

export function useUpdatePet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePet,
    onSuccess: () => invalidatePets(queryClient),
    onError: (error) => {
      // 404: hồ sơ đã bị gỡ ở nơi khác; làm mới để danh sách không còn hồ sơ đó.
      if (toApiError(error).status === 404) void invalidatePets(queryClient);
    },
  });
}
