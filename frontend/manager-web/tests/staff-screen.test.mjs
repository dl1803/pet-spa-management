import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffScreenFallback } from "../features/staff/components/staff-screen-fallback.tsx";
import { FORM_MESSAGES, toStaffCreateRequest, toStaffUpdateRequest } from "../features/staff/forms.ts";
import { countStaff, filterStaff } from "../features/staff/list.ts";
import { MOCK_STAFF, createMockStaff, deactivateMockStaff, updateMockStaff } from "../features/staff/mock-data.ts";
import { ApiError } from "../lib/api/errors.ts";

// StaffScreen dùng next/navigation và toast nên không render được bằng renderToStaticMarkup (không có Next/DOM).
// Các thao tác của màn (thêm, sửa, vô hiệu hóa) đã nằm trong hàm thuần của mock-data.ts; test ở đây chạy đúng các hàm
// StaffScreen gọi, rồi kiểm tra số trên chip và dòng tiêu đề qua countStaff/filterStaff như màn dùng.

const names = (staff, filter) => filterStaff(staff, filter).map((member) => member.fullName);
const newSpa = { fullName: " Huỳnh Gia Hân ", phone: "0944 120 678", staffRole: "SpaStaff", password: "Mk@12345" };

test("thêm nhân viên: thêm cuối danh sách, đang hoạt động, số điện thoại liền, số chip tăng", () => {
  const next = createMockStaff(MOCK_STAFF, toStaffCreateRequest(newSpa), "id-moi");
  assert.equal(next.length, 7);
  assert.deepEqual(next.at(-1), { staffId: "id-moi", userName: "0944120678", fullName: "Huỳnh Gia Hân", staffRole: "SpaStaff", isActive: true });
  assert.deepEqual(countStaff(next), { all: 7, spa: 5, receptionist: 2, inactive: 1, activeSpa: 4, activeReceptionist: 2 });
  assert.equal(names(next, "spa").at(-1), "Huỳnh Gia Hân");
  assert.equal(MOCK_STAFF.length, 6, "không sửa danh sách cũ");
});

test("thêm nhân viên trùng số điện thoại của người đang hoạt động: 409 DUPLICATE_CONTACT, danh sách giữ nguyên", () => {
  const request = toStaffCreateRequest({ ...newSpa, phone: "0912 334 501" }); // Nguyễn Thị Hạnh
  assert.throws(
    () => createMockStaff(MOCK_STAFF, request, "id-moi"),
    (error) => error instanceof ApiError && error.status === 409 && error.code === "DUPLICATE_CONTACT" && error.title === FORM_MESSAGES.phoneDuplicate,
  );
  assert.equal(MOCK_STAFF.length, 6);
});

test("trùng số điện thoại của tài khoản đã vô hiệu hóa vẫn bị chặn", () => {
  const request = toStaffCreateRequest({ ...newSpa, phone: "0918402773" }); // Đặng Hoàng Phúc, isActive = false
  assert.throws(() => createMockStaff(MOCK_STAFF, request, "id-moi"), (error) => error.code === "DUPLICATE_CONTACT");
});

test("trùng số điện thoại được so sánh sau khi chuẩn hóa, cả khi request đưa vào chưa chuẩn hóa", () => {
  const raw = { userName: "0987.210-334", fullName: "A", staffRole: "Receptionist", password: "x" }; // Trần Thị Quyên
  assert.throws(() => createMockStaff(MOCK_STAFF, raw, "id-moi"), (error) => error.code === "DUPLICATE_CONTACT");
});

test("sau khi thêm nhân viên, thêm lại cùng số điện thoại bị chặn", () => {
  const next = createMockStaff(MOCK_STAFF, toStaffCreateRequest(newSpa), "id-moi");
  assert.throws(() => createMockStaff(next, toStaffCreateRequest({ ...newSpa, fullName: "Người khác" }), "id-khac"), (error) => error.code === "DUPLICATE_CONTACT");
  assert.equal(next.length, 7);
});

test("sửa nhân viên: chỉ đổi họ tên và vai trò, giữ số điện thoại, trạng thái; chip nhóm vai trò cập nhật", () => {
  const tam = MOCK_STAFF.find((member) => member.fullName === "Lê Minh Tâm");
  const update = toStaffUpdateRequest({ fullName: " Lê Minh Tâm Anh ", phone: tam.userName, staffRole: "Receptionist", password: "" });
  const next = updateMockStaff(MOCK_STAFF, tam.staffId, update);
  assert.deepEqual(next.find((member) => member.staffId === tam.staffId), { ...tam, fullName: "Lê Minh Tâm Anh", staffRole: "Receptionist" });
  assert.equal(next.length, 6);
  assert.deepEqual(next.filter((member) => member.staffId !== tam.staffId), MOCK_STAFF.filter((member) => member.staffId !== tam.staffId));
  assert.deepEqual(countStaff(next), { all: 6, spa: 3, receptionist: 3, inactive: 1, activeSpa: 2, activeReceptionist: 3 });
  assert.ok(names(next, "receptionist").includes("Lê Minh Tâm Anh") && !names(next, "spa").includes("Lê Minh Tâm Anh"));
  assert.equal(tam.fullName, "Lê Minh Tâm", "không sửa đối tượng cũ");
});

test("vô hiệu hóa: người đó vẫn trong nhóm vai trò, vào nhóm Đã vô hiệu hóa, dòng tiêu đề giảm", () => {
  const tam = MOCK_STAFF.find((member) => member.fullName === "Lê Minh Tâm");
  const next = deactivateMockStaff(MOCK_STAFF, tam.staffId);
  assert.equal(next.length, 6);
  assert.equal(next.find((member) => member.staffId === tam.staffId).isActive, false);
  assert.deepEqual(names(next, "inactive"), ["Lê Minh Tâm", "Đặng Hoàng Phúc"]); // theo thứ tự trong danh sách
  assert.ok(names(next, "spa").includes("Lê Minh Tâm"));
  assert.deepEqual(countStaff(next), { all: 6, spa: 4, receptionist: 2, inactive: 2, activeSpa: 2, activeReceptionist: 2 });
  assert.equal(tam.isActive, true, "không sửa đối tượng cũ");
});

test("vô hiệu hóa hai lần không đổi thêm gì; id không tồn tại thì danh sách giữ nguyên nội dung", () => {
  const phuc = MOCK_STAFF.find((member) => member.fullName === "Đặng Hoàng Phúc");
  assert.deepEqual(deactivateMockStaff(MOCK_STAFF, phuc.staffId), MOCK_STAFF);
  assert.deepEqual(deactivateMockStaff(MOCK_STAFF, "khong-co"), MOCK_STAFF);
  assert.deepEqual(updateMockStaff(MOCK_STAFF, "khong-co", { fullName: "X", staffRole: "SpaStaff" }), MOCK_STAFF);
});

test("khung chờ của Suspense: có tiêu đề Nhân viên và thông báo đang tải, không chứa dữ liệu nhân viên", () => {
  const html = renderToStaticMarkup(React.createElement(StaffScreenFallback));
  assert.ok(html.includes("<h1>Nhân viên</h1>"));
  assert.match(html, /role="status"[^>]*>Đang tải danh sách nhân viên…</);
  assert.match(html, /aria-busy="true"/);
  assert.ok(!html.includes("<table") && !html.includes("Thêm nhân viên"));
});
