import { apiClient } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";

// GET /me: tài khoản lấy từ access token, không gửi id.
export async function getMe() {
  const { data } = await apiClient.get<Me>("/me");
  return data;
}
