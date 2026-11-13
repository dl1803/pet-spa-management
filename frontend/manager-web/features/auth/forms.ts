import { toApiError } from "@/lib/api/errors";
import type { LoginRequest } from "@/lib/api/types";

export type LoginFormValues = {
  phone: string;
  password: string;
};

export const LOGIN_DEFAULT_VALUES: LoginFormValues = {
  phone: "",
  password: "",
};

export const LOGIN_MESSAGES = {
  phoneRequired: "Vui lòng nhập số điện thoại.",
  passwordRequired: "Vui lòng nhập mật khẩu.",
} as const;

// Số điện thoại bỏ khoảng trắng, dấu chấm, gạch ngang (Frontend-Conventions 4.1).
export function normalizePhone(value: string) {
  return value.replace(/[\s.-]/g, "");
}

// Chỉ kiểm tra có nhập, không kiểm tra định dạng (khớp LoginRequestValidator của backend).
export function validateLoginPhone(value: string): true | string {
  return normalizePhone(value) !== "" || LOGIN_MESSAGES.phoneRequired;
}

export function validateLoginPassword(value: string): true | string {
  return value !== "" || LOGIN_MESSAGES.passwordRequired;
}

export function toLoginRequest(values: LoginFormValues): LoginRequest {
  return { userName: normalizePhone(values.phone), password: values.password };
}

// 401: sai thông tin hoặc tài khoản bị vô hiệu hóa (backend không phân biệt).
export function isLoginRejectedError(error: unknown) {
  return toApiError(error).status === 401;
}

// 403 từ /api/session/login: đăng nhập đúng nhưng tài khoản không thuộc web quản lý.
export function isWrongWebError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 403 && code === "FORBIDDEN";
}
