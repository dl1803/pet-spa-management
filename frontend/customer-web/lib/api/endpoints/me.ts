import { apiClient } from "@/lib/api/client";
import type { Me, UpdateMeRequest } from "@/lib/api/types";

export async function getMe() {
  const { data } = await apiClient.get<Me>("/me");
  return data;
}

// Backend trả 200 không nội dung.
export async function updateMe(request: UpdateMeRequest): Promise<void> {
  await apiClient.put("/me", request);
}

