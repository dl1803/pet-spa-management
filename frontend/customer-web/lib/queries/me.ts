import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, updateMe } from "@/lib/api/endpoints/me";
import type { UpdateMeRequest } from "@/lib/api/types";
import { hasAccessToken, refreshAccessToken } from "@/lib/auth/session";

export const meKeys = {
  all: ["me"] as const,
};

// Tải lại trang thì access token mất: làm mới bằng cookie trước rồi mới gọi GET /me.
async function loadMe() {
  if (!hasAccessToken()) await refreshAccessToken();
  return getMe();
}

export function useMe() {
  return useQuery({ queryKey: meKeys.all, queryFn: loadMe });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: UpdateMeRequest) => updateMe(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meKeys.all }),
  });
}

