import { toApiError } from "@/lib/api/errors";
import type { Me, UpdateMeRequest } from "@/lib/api/types";
import { normalizePhone } from "@/lib/validation";

export type ProfileFormValues = {
  fullName: string;
  phone: string;
  email: string;
};

export const PROFILE_SAVED_MESSAGE = "Đã lưu thông tin cá nhân";
export const DUPLICATE_CONTACT_MESSAGE = "Thông tin liên hệ này đã được sử dụng.";
export const PHONE_HINT = "Cũng là tên đăng nhập. Đổi số sẽ đổi luôn tên đăng nhập.";

export function toProfileFormValues(me: Me): ProfileFormValues {
  return {
    fullName: me.fullName ?? "",
    phone: me.phone ?? "",
    email: me.email ?? "",
  };
}

export function toUpdateMeRequest(values: ProfileFormValues): UpdateMeRequest {
  const email = values.email.trim();
  return {
    fullName: values.fullName.trim(),
    phone: normalizePhone(values.phone),
    ...(email ? { email } : {}),
  };
}

export function isDuplicateContactError(error: unknown) {
  const { status, code } = toApiError(error);
  return status === 409 && code === "DUPLICATE_CONTACT";
}

export function isUnauthenticatedError(error: unknown) {
  return toApiError(error).status === 401;
}

