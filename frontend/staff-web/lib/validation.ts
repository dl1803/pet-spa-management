export const FULL_NAME_MAX_LENGTH = 150;
export const EMAIL_MAX_LENGTH = 150;

export const FULL_NAME_REQUIRED_MESSAGE = "Vui lòng nhập họ tên.";
export const FULL_NAME_TOO_LONG_MESSAGE = `Họ tên tối đa ${FULL_NAME_MAX_LENGTH} ký tự.`;
export const PHONE_REQUIRED_MESSAGE = "Vui lòng nhập số điện thoại.";
export const PHONE_INVALID_MESSAGE = "Số điện thoại chưa đúng định dạng.";
export const EMAIL_INVALID_MESSAGE = "Email chưa đúng định dạng.";
export const EMAIL_TOO_LONG_MESSAGE = `Email tối đa ${EMAIL_MAX_LENGTH} ký tự.`;
export const PASSWORD_REQUIRED_MESSAGE = "Vui lòng nhập mật khẩu.";

// Số điện thoại: 10 chữ số, bắt đầu bằng 0, sau khi bỏ khoảng trắng, dấu chấm, gạch ngang.
const PHONE_PATTERN = /^0\d{9}$/;
// Email dạng a@b.c
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(value: string) {
  return value.replace(/[\s.-]/g, "");
}

export function validatePhone(value: string): true | string {
  const phone = normalizePhone(value);
  if (phone === "") return PHONE_REQUIRED_MESSAGE;
  return PHONE_PATTERN.test(phone) || PHONE_INVALID_MESSAGE;
}

export function validateFullName(value: string): true | string {
  const fullName = value.trim();
  if (fullName === "") return FULL_NAME_REQUIRED_MESSAGE;
  return fullName.length <= FULL_NAME_MAX_LENGTH || FULL_NAME_TOO_LONG_MESSAGE;
}

export function validateOptionalEmail(value: string): true | string {
  const email = value.trim();
  if (email === "") return true;
  if (email.length > EMAIL_MAX_LENGTH) return EMAIL_TOO_LONG_MESSAGE;
  return EMAIL_PATTERN.test(email) || EMAIL_INVALID_MESSAGE;
}

export function validatePasswordRequired(value: string): true | string {
  return value !== "" || PASSWORD_REQUIRED_MESSAGE;
}

