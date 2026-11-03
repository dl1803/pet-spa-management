import assert from "node:assert/strict";
import test from "node:test";
import {
  FORM_MESSAGES,
  STAFF_ROLE_ORDER,
  createStaffFormValues,
  normalizePhone,
  toStaffCreateRequest,
  toStaffUpdateRequest,
  validateFullName,
  validatePassword,
  validatePhone,
  validateStaffRole,
} from "../features/staff/forms.ts";
import { STAFF_FILTERS, countStaff, filterStaff, getGivenName, parseStaffFilter } from "../features/staff/list.ts";
import { MOCK_STAFF, buildMockStaff } from "../features/staff/mock-data.ts";
import { formatPhone } from "../lib/format.ts";
import { STAFF_ROLE_LABELS } from "../lib/labels.ts";

test("dữ liệu mô phỏng khớp MW-08: 6 người, số trên chip và dòng tiêu đề", () => {
  assert.deepEqual(countStaff(MOCK_STAFF), { all: 6, spa: 4, receptionist: 2, inactive: 1, activeSpa: 3, activeReceptionist: 2 });
  assert.deepEqual(
    MOCK_STAFF.map((member) => [member.fullName, formatPhone(member.userName), STAFF_ROLE_LABELS[member.staffRole], member.isActive]),
    [
      ["Nguyễn Thị Hạnh", "0912 334 501", "Nhân viên spa", true],
      ["Trần Thị Quyên", "0987 210 334", "Nhân viên spa", true],
      ["Lê Minh Tâm", "0905 667 812", "Nhân viên spa", true],
      ["Đặng Hoàng Phúc", "0918 402 773", "Nhân viên spa", false],
      ["Phạm Thu Hà", "0934 778 120", "Lễ tân", true],
      ["Vũ Khánh Linh", "0976 455 019", "Lễ tân", true],
    ],
  );
  assert.equal(new Set(MOCK_STAFF.map((member) => member.staffId)).size, 6);
});

test("chỉ có hai vai trò theo openapi, Lễ tân đứng trước", () => {
  assert.deepEqual(STAFF_ROLE_ORDER, ["Receptionist", "SpaStaff"]);
  assert.deepEqual(Object.keys(STAFF_ROLE_LABELS).sort(), ["Receptionist", "SpaStaff"]);
});

test("bộ lọc: nhóm vai trò gồm cả người đã vô hiệu hóa; Đã vô hiệu hóa chỉ gồm người bị vô hiệu hóa", () => {
  const names = (filter) => filterStaff(MOCK_STAFF, filter).map((member) => member.fullName);
  assert.equal(names("all").length, 6);
  assert.deepEqual(names("spa"), ["Nguyễn Thị Hạnh", "Trần Thị Quyên", "Lê Minh Tâm", "Đặng Hoàng Phúc"]);
  assert.deepEqual(names("receptionist"), ["Phạm Thu Hà", "Vũ Khánh Linh"]);
  assert.deepEqual(names("inactive"), ["Đặng Hoàng Phúc"]);
});

test("tham số lọc lạ hoặc thiếu thì về Tất cả", () => {
  assert.deepEqual(STAFF_FILTERS.map((item) => item.value), ["all", "spa", "receptionist", "inactive"]);
  assert.equal(parseStaffFilter("spa"), "spa");
  for (const bad of [null, "", "Spa", "manager"]) assert.equal(parseStaffFilter(bad), "all", String(bad));
});

test("tên gọi trong câu là từ cuối của họ tên", () => {
  assert.equal(getGivenName("Lê Minh Tâm"), "Tâm");
  assert.equal(getGivenName("  Phúc "), "Phúc");
});

test("số điện thoại: bỏ khoảng trắng, dấu chấm, gạch ngang; 10 chữ số bắt đầu bằng 0", () => {
  assert.equal(normalizePhone("0944 120-678"), "0944120678");
  assert.equal(validatePhone("0944 120 678"), true);
  assert.equal(validatePhone("0944.120.678"), true);
  assert.equal(validatePhone("  "), FORM_MESSAGES.phoneRequired);
  for (const bad of ["944120678", "09441206789", "0944 12O 678", "+84944120678"]) assert.equal(validatePhone(bad), FORM_MESSAGES.phoneInvalid, bad);
});

test("họ tên, vai trò, mật khẩu: bắt buộc; họ tên tối đa 150 ký tự", () => {
  assert.equal(validateFullName(" Huỳnh Gia Hân "), true);
  assert.equal(validateFullName("   "), FORM_MESSAGES.fullNameRequired);
  assert.equal(validateFullName("a".repeat(150)), true);
  assert.equal(validateFullName("a".repeat(151)), FORM_MESSAGES.fullNameTooLong);
  assert.equal(validateStaffRole(""), FORM_MESSAGES.staffRoleRequired);
  assert.equal(validateStaffRole("SpaStaff"), true);
  assert.equal(validatePassword(""), FORM_MESSAGES.passwordRequired);
  assert.equal(validatePassword(" x "), true);
});

test("mật khẩu toàn khoảng trắng coi như chưa nhập; độ mạnh vẫn do backend kiểm tra", () => {
  for (const blank of ["   ", " ", "\t", " \n "]) assert.equal(validatePassword(blank), FORM_MESSAGES.passwordRequired, JSON.stringify(blank));
  // Không có luật độ dài ở web (Frontend-Conventions 4.2): mật khẩu ngắn vẫn qua, backend/Identity sẽ trả lỗi.
  assert.equal(validatePassword("a"), true);
});

test("form thêm mới trống, chưa chọn vai trò; form sửa lấy dữ liệu hiện có và không mang mật khẩu", () => {
  assert.deepEqual(createStaffFormValues(), { fullName: "", phone: "", staffRole: "", password: "" });
  assert.deepEqual(createStaffFormValues(MOCK_STAFF[4]), {
    fullName: "Phạm Thu Hà",
    phone: "0934778120",
    staffRole: "Receptionist",
    password: "",
  });
});

test("yêu cầu tạo gửi đúng 4 trường openapi, không có role; mật khẩu giữ nguyên", () => {
  const request = toStaffCreateRequest({ fullName: "  Huỳnh Gia Hân ", phone: "0944 120 678", staffRole: "SpaStaff", password: " Mk 123 " });
  assert.deepEqual(request, { userName: "0944120678", fullName: "Huỳnh Gia Hân", staffRole: "SpaStaff", password: " Mk 123 " });
  assert.deepEqual(Object.keys(request).sort(), ["fullName", "password", "staffRole", "userName"]);
});

test("yêu cầu sửa chỉ gồm fullName và staffRole; chưa chọn vai trò thì không dựng được yêu cầu", () => {
  const update = toStaffUpdateRequest({ fullName: " Lê Minh Tâm ", phone: "0905667812", staffRole: "Receptionist", password: "" });
  assert.deepEqual(update, { fullName: "Lê Minh Tâm", staffRole: "Receptionist" });
  assert.throws(() => toStaffUpdateRequest({ fullName: "A", phone: "", staffRole: "", password: "" }));
  assert.throws(() => toStaffCreateRequest({ fullName: "A", phone: "0944120678", staffRole: "", password: "x" }));
});

test("buildMockStaff tạo tài khoản đang hoạt động và không giữ mật khẩu", () => {
  const created = buildMockStaff({ userName: "0944120678", fullName: "Huỳnh Gia Hân", staffRole: "SpaStaff", password: "bí mật" }, "id-moi");
  assert.deepEqual(created, { staffId: "id-moi", userName: "0944120678", fullName: "Huỳnh Gia Hân", staffRole: "SpaStaff", isActive: true });
});
