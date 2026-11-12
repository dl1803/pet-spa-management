import { toApiError } from "@/lib/api/errors";
import type { LoginRequest } from "@/lib/api/types";
import { normalizePhone, PHONE_REQUIRED_MESSAGE } from "@/lib/validation";

export type LoginFormValues = {
  phone: string;
  password: string;
};

export const LOGIN_DEFAULT_VALUES: LoginFormValues = {
  phone: "",
  password: "",
};

// Chỉ kiểm tra có nhập, không kiểm tra định dạng (khớp LoginRequestValidator của backend).
export function validateLoginPhone(value: string): true | string {
  return normalizePhone(value) !== "" || PHONE_REQUIRED_MESSAGE;
}

export function toLoginRequest(values: LoginFormValues): LoginRequest {
  return { userName: normalizePhone(values.phone), password: values.password };
}

// 401: sai thông tin hoặc tài khoản bị vô hiệu hóa (backend không phân biệt).
export function isLoginRejectedError(error: unknown) {
  return toApiError(error).status === 401;
}

// 403 từ /api/session/login: đăng nhập đúng nhưng tài khoản không thuộc web nhân viên.
export function isWrongWebError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 403 && code === "FORBIDDEN";
}
