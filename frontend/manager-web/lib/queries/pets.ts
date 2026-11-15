import { skipToken, useQuery } from "@tanstack/react-query";
import { getPet } from "@/lib/api/endpoints/pets";

export const petKeys = {
  all: ["pets"] as const,
  detail: (petId: string | null) => ["pets", "detail", petId] as const,
};

// petId = null: chưa chọn lịch nào, không gọi API.
export function usePet(petId: string | null) {
  return useQuery({
    queryKey: petKeys.detail(petId),
    queryFn: petId === null ? skipToken : () => getPet(petId),
  });
}
