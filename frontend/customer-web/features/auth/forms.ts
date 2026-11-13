import { toApiError } from "@/lib/api/errors";
import type { LoginRequest, RegisterRequest } from "@/lib/api/types";
import { normalizePhone, PHONE_REQUIRED_MESSAGE } from "@/lib/validation";

export type RegisterFormValues = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const REGISTER_DEFAULT_VALUES: RegisterFormValues = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const REGISTER_SUCCESS_MESSAGE = "Đã tạo tài khoản. Mời bạn đăng nhập.";
export const DUPLICATE_PHONE_MESSAGE = "Thông tin liên hệ này đã được sử dụng. Hãy đăng nhập hoặc dùng số khác.";
export const CONFIRM_PASSWORD_REQUIRED_MESSAGE = "Vui lòng nhập lại mật khẩu.";
export const CONFIRM_PASSWORD_MISMATCH_MESSAGE = "Mật khẩu nhập lại không khớp.";

export function validateConfirmPassword(value: string, values: RegisterFormValues): true | string {
  if (value === "") return CONFIRM_PASSWORD_REQUIRED_MESSAGE;
  return value === values.password || CONFIRM_PASSWORD_MISMATCH_MESSAGE;
}

export function toRegisterRequest(values: RegisterFormValues): RegisterRequest {
  const email = values.email.trim();
  return {
    userName: normalizePhone(values.phone),
    fullName: values.fullName.trim(),
    password: values.password,
    ...(email ? { email } : {}),
  };
}

export function isDuplicateContactError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 409 && code === "DUPLICATE_CONTACT";
}

export type LoginFormValues = {
  phone: string;
  password: string;
};

export const LOGIN_DEFAULT_VALUES: LoginFormValues = {
  phone: "",
  password: "",
};

export const LOGIN_FAILED_MESSAGE = "Thông tin đăng nhập không đúng.";
export const LOGIN_WRONG_WEB_MESSAGE = "Tài khoản không có quyền truy cập web này";

export function validateLoginPhone(value: string): true | string {
  return normalizePhone(value) !== "" || PHONE_REQUIRED_MESSAGE;
}

export function toLoginRequest(values: LoginFormValues): LoginRequest {
  return { userName: normalizePhone(values.phone), password: values.password };
}

export function isLoginRejectedError(error: unknown) {
  return toApiError(error).status === 401;
}

export const SESSION_EXPIRED_MESSAGE = "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";

// Route handler đăng nhập trả 403 khi tài khoản không phải khách hàng.
export function isWrongWebError(error: unknown) {
  return toApiError(error).status === 403;
}


