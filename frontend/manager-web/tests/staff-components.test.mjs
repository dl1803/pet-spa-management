import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DeactivateStaffDialog } from "../features/staff/components/deactivate-staff-dialog.tsx";
import { StaffTable } from "../features/staff/components/staff-table.tsx";
import { MOCK_STAFF } from "../features/staff/mock-data.ts";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const renderTable = (staff) => renderToStaticMarkup(React.createElement(StaffTable, { staff, onEdit: noop, onDeactivate: noop }));

test("bảng nhân viên: 6 dòng, không có cột Ngày tạo, nhãn trạng thái và vai trò", () => {
  const html = renderTable(MOCK_STAFF);
  assert.equal(count(html, /<tr\b/g), 7);
  for (const heading of ["Nhân viên", "Số điện thoại (đăng nhập)", "Vai trò", "Trạng thái", "Thao tác"]) assert.ok(html.includes(`>${heading}</th>`), heading);
  assert.ok(!html.includes("Ngày tạo"));
  assert.equal(count(html, /Đang hoạt động<\/span>/g), 5);
  assert.equal(count(html, /Đã vô hiệu hóa<\/span>/g), 1);
  assert.equal(count(html, />Nhân viên spa<\/td>/g), 4);
  assert.equal(count(html, />Lễ tân<\/td>/g), 2);
  for (const phone of ["0912 334 501", "0987 210 334", "0905 667 812", "0918 402 773", "0934 778 120", "0976 455 019"]) assert.ok(html.includes(phone), phone);
});

test("bảng nhân viên: người đã vô hiệu hóa chỉ có nút Sửa và dòng mờ; avatar theo vai trò", () => {
  const html = renderTable(MOCK_STAFF);
  assert.equal(count(html, /aria-label="Sửa nhân viên /g), 6);
  assert.equal(count(html, /aria-label="Vô hiệu hóa tài khoản /g), 5);
  assert.ok(!html.includes('aria-label="Vô hiệu hóa tài khoản Đặng Hoàng Phúc"'));
  assert.equal(count(html, /opacity-70/g), 1);
  assert.equal(count(html, /bg-lagoon-50 text-lagoon-700/g), 4);
  assert.equal(count(html, /bg-apricot-100 text-apricot-700/g), 2);
  // Chữ viết tắt do Avatar có sẵn tính (họ + tên cuối).
  assert.ok(html.includes(">NH<") && html.includes(">ĐP<") && html.includes(">VL<"));
});

test("bảng nhân viên rỗng hiện trạng thái rỗng, không có bảng", () => {
  const html = renderTable([]);
  assert.ok(html.includes("Chưa có nhân viên nào"));
  assert.ok(!html.includes("<table"));
});

test("hộp thoại vô hiệu hóa nhân viên spa: 3 hậu quả theo UI demo, nút Quay lại và Vô hiệu hóa", () => {
  const tam = MOCK_STAFF.find((member) => member.fullName === "Lê Minh Tâm");
  const html = renderToStaticMarkup(React.createElement(DeactivateStaffDialog, { staff: tam, onConfirm: noop, onCancel: noop }));
  assert.match(html, /<dialog\b[^>]*aria-labelledby=/);
  assert.ok(html.includes("Vô hiệu hóa tài khoản Lê Minh Tâm?"));
  assert.ok(html.includes("Dùng khi nhân viên nghỉ việc."));
  assert.equal(count(html, /<li>/g), 3);
  assert.ok(html.includes("Tâm mất quyền đăng nhập ngay lập tức."));
  assert.ok(html.includes("quay về Chờ xác nhận để bạn phân công lại. Khách hàng nhận thông báo."));
  assert.ok(html.includes("Tâm không còn xuất hiện trong danh sách đề xuất và lịch làm việc."));
  assert.ok(html.indexOf("Quay lại") < html.indexOf("Vô hiệu hóa</button>"));
  assert.ok(html.includes("bg-danger"));
});

test("hộp thoại vô hiệu hóa lễ tân chỉ nêu việc mất quyền đăng nhập", () => {
  const ha = MOCK_STAFF.find((member) => member.fullName === "Phạm Thu Hà");
  const html = renderToStaticMarkup(React.createElement(DeactivateStaffDialog, { staff: ha, onConfirm: noop, onCancel: noop }));
  assert.equal(count(html, /<li>/g), 1);
  assert.ok(html.includes("Hà mất quyền đăng nhập ngay lập tức."));
  assert.ok(!html.includes("Chờ xác nhận"));
});
