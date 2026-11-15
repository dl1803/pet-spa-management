import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPet,
  deletePet,
  getPet,
  listPets,
  updatePet,
  type UpdatePetVariables,
} from "@/lib/api/endpoints/pets";
import type { PetRequest } from "@/lib/api/types";

export const PETS_PAGE_SIZE = 50;

export const petKeys = {
  all: ["pets"] as const,
  list: () => ["pets", "list"] as const,
  detail: (petId: string) => ["pets", "detail", petId] as const,
};

export function usePets() {
  return useQuery({
    queryKey: petKeys.list(),
    queryFn: () => listPets({ page: 1, pageSize: PETS_PAGE_SIZE }),
  });
}

// Không kích hoạt tải chi tiết khi petId là null (dùng cho form thêm mới).
export function usePet(petId: string | null) {
  const id = petId;
  return useQuery({
    queryKey: petKeys.detail(id ?? ""),
    queryFn: id === null ? skipToken : () => getPet(id),
  });
}

function useRefreshPets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: petKeys.all, refetchType: "all" });
}

export function useCreatePet() {
  const refreshPets = useRefreshPets();
  return useMutation({
    mutationFn: (request: PetRequest) => createPet(request),
    onSuccess: refreshPets,
  });
}

export function useUpdatePet() {
  const refreshPets = useRefreshPets();
  return useMutation({
    mutationFn: (variables: UpdatePetVariables) => updatePet(variables),
    onSuccess: refreshPets,
  });
}

export function useDeletePet() {
  const refreshPets = useRefreshPets();
  return useMutation({
    mutationFn: (petId: string) => deletePet(petId),
    onSettled: refreshPets,
  });
}
