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

// Làm mới cache thú cưng: nếu có customerId/petId thì làm mới đúng query mục tiêu; không truyền thì làm mới toàn bộ.
export function invalidatePets(queryClient: QueryClient, customerId?: string, petId?: string) {
  const promises: Promise<void>[] = [];
  if (customerId) {
    promises.push(queryClient.invalidateQueries({ queryKey: petKeys.list(customerId) }));
  } else {
    promises.push(queryClient.invalidateQueries({ queryKey: petKeys.all }));
  }
  if (petId) {
    promises.push(queryClient.invalidateQueries({ queryKey: petKeys.detail(petId) }));
  }
  return Promise.all(promises);
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
    onSuccess: (_data, variables) => invalidatePets(queryClient, variables.customerId),
  });
}

export function useUpdatePet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePet,
    onSuccess: (_data, variables) =>
      invalidatePets(queryClient, variables.request.customerId, variables.petId),
    onError: (error, variables) => {
      // 404: hồ sơ đã bị gỡ ở nơi khác; làm mới để danh sách không còn hồ sơ đó.
      if (toApiError(error).status === 404) {
        void invalidatePets(queryClient, variables.request.customerId, variables.petId);
      }
    },
  });
}
