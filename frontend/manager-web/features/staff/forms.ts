import type { Staff, StaffCreateRequest, StaffRole, StaffUpdateRequest } from "@/lib/api/types";

// Thứ tự hiển thị vai trò, theo UI demo (MW-08·D1): Lễ tân trước, Nhân viên spa sau.
export const STAFF_ROLE_ORDER: StaffRole[] = ["Receptionist", "SpaStaff"];

export const FULL_NAME_MAX_LENGTH = 150;

export const FORM_MESSAGES = {
  fullNameRequired: "Vui lòng nhập họ tên.",
  fullNameTooLong: `Họ tên tối đa ${FULL_NAME_MAX_LENGTH} ký tự.`,
  phoneRequired: "Vui lòng nhập số điện thoại.",
  phoneInvalid: "Số điện thoại chưa đúng định dạng.",
  staffRoleRequired: "Vui lòng chọn vai trò nhân viên (lễ tân hoặc nhân viên spa).",
  passwordRequired: "Vui lòng nhập mật khẩu.",
} as const;

// Số điện thoại: 10 chữ số, bắt đầu bằng 0, sau khi bỏ khoảng trắng, dấu chấm, gạch ngang (Frontend-Conventions 4.2).
const PHONE_PATTERN = /^0\d{9}$/;

export type StaffFormValues = {
  fullName: string;
  // Chỉ nhập khi tạo; khi sửa là số điện thoại hiện có, chỉ đọc.
  phone: string;
  // "" = chưa chọn.
  staffRole: StaffRole | "";
  // Chỉ có khi tạo.
  password: string;
};

export function normalizePhone(value: string) {
  return value.replace(/[\s.-]/g, "");
}

export function createStaffFormValues(staff?: Staff): StaffFormValues {
  return {
    fullName: staff?.fullName ?? "",
    phone: staff?.userName ?? "",
    staffRole: staff?.staffRole ?? "",
    password: "",
  };
}

export function validateFullName(value: string): true | string {
  const fullName = value.trim();
  if (fullName === "") return FORM_MESSAGES.fullNameRequired;
  return fullName.length <= FULL_NAME_MAX_LENGTH || FORM_MESSAGES.fullNameTooLong;
}

export function validatePhone(value: string): true | string {
  const phone = normalizePhone(value);
  if (phone === "") return FORM_MESSAGES.phoneRequired;
  return PHONE_PATTERN.test(phone) || FORM_MESSAGES.phoneInvalid;
}

export function validateStaffRole(value: StaffRole | ""): true | string {
  return value !== "" || FORM_MESSAGES.staffRoleRequired;
}

// Độ mạnh mật khẩu do backend kiểm tra (Frontend-Conventions 4.2); web chỉ yêu cầu đã nhập.
export function validatePassword(value: string): true | string {
  return value !== "" || FORM_MESSAGES.passwordRequired;
}

// Form đã qua kiểm tra thì staffRole khác "". Không âm thầm đặt vai trò mặc định: chọn nhầm vai trò là lỗi phân quyền.
function requireStaffRole(value: StaffRole | ""): StaffRole {
  if (value === "") throw new Error("Chưa chọn vai trò nhân viên.");
  return value;
}

// Không gửi `role` (backend đặt Role = Staff).
export function toStaffCreateRequest(values: StaffFormValues): StaffCreateRequest {
  return {
    userName: normalizePhone(values.phone),
    fullName: values.fullName.trim(),
    staffRole: requireStaffRole(values.staffRole),
    password: values.password,
  };
}

// Số điện thoại không đổi ở thao tác sửa (openapi StaffUpdateRequest).
export function toStaffUpdateRequest(values: StaffFormValues): StaffUpdateRequest {
  return {
    fullName: values.fullName.trim(),
    staffRole: requireStaffRole(values.staffRole),
  };
}
