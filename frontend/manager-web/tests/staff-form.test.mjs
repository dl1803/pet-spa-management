import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffForm } from "../features/staff/components/staff-form.tsx";
import { MOCK_STAFF } from "../features/staff/mock-data.ts";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const render = (props) => renderToStaticMarkup(React.createElement(StaffForm, { onCreate: noop, onUpdate: noop, onCancel: noop, ...props }));

test("form thêm: 4 ô theo UI demo, 2 thẻ vai trò chưa chọn, mật khẩu và gợi ý", () => {
  const html = render({});
  for (const text of ["Họ tên", "Số điện thoại", "Vai trò", "Mật khẩu ban đầu"]) assert.ok(html.includes(text), text);
  assert.ok(html.includes("Dùng làm tên đăng nhập."));
  assert.ok(html.includes("Nhân viên dùng để đăng nhập web nhân viên lần đầu."));
  assert.equal(count(html, /type="radio"/g), 2);
  assert.equal(count(html, /type="radio"[^>]*checked=""/g), 0);
  assert.ok(html.includes("Lễ tân") && html.includes("Nhân viên spa"));
  assert.ok(html.includes("Ghi nhận khách vãng lai, đặt lịch thay, tiếp nhận, trả thú cưng, thu tiền tại quầy"));
  assert.ok(html.includes("Thực hiện lịch spa được phân công, chụp ảnh trước và sau"));
  assert.ok(html.indexOf("Lễ tân") < html.indexOf("Nhân viên spa"));
  assert.match(html, /type="password"[^>]*autoComplete="new-password"/);
  assert.ok(html.includes("Hủy bỏ") && html.includes("Tạo tài khoản"));
  assert.ok(!html.includes("Lưu thay đổi"));
  assert.ok(!html.includes('role="alert"'));
  assert.ok(!/readOnly/.test(html));
});

test("form sửa: vai trò hiện có được chọn, số điện thoại chỉ đọc, không có ô mật khẩu", () => {
  const html = render({ staff: MOCK_STAFF[4] });
  assert.equal(count(html, /type="radio"[^>]*checked=""/g), 1);
  assert.match(html, /value="Receptionist"[^>]*checked=""|checked=""[^>]*value="Receptionist"/);
  assert.match(html, /type="tel"[^>]*readOnly=""|readOnly=""[^>]*type="tel"/);
  assert.ok(!html.includes("Mật khẩu ban đầu"));
  assert.ok(!html.includes('type="password"'));
  assert.ok(html.includes("Lưu thay đổi"));
  assert.ok(!html.includes("Tạo tài khoản"));
});
