import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginSession, logoutSession, register } from "@/lib/api/endpoints/auth";
import type { LoginRequest, RegisterRequest } from "@/lib/api/types";
import { setAccessToken } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";
import { meKeys } from "./me";

export function useRegister() {
  return useMutation({ mutationFn: (request: RegisterRequest) => register(request) });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: LoginRequest) => loginSession(request),
    onSuccess: ({ accessToken, me }) => {
      setAccessToken(accessToken);
      queryClient.setQueryData(meKeys.all, me);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => logoutSession(),
    // Dù thành công hay lỗi đều tải hẳn trang đăng nhập để xóa access token và bộ đệm (cookie đã bị route handler xóa).
    onSettled: () => {
      window.location.replace(ROUTES.login);
    },
  });
}

