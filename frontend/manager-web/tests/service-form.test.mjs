import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ServiceForm } from "../features/services/components/service-form.tsx";
import { MOCK_SERVICES, MOCK_SLOT_TIMES } from "../features/services/mock-data.ts";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const cutTia = MOCK_SERVICES[1];

test("form sửa: nhãn bắt buộc, giá của các loài đã chọn, mốc giờ từ cấu hình", () => {
  const html = renderToStaticMarkup(
    React.createElement(ServiceForm, { service: cutTia, slotTimes: MOCK_SLOT_TIMES, onSubmit: noop, onCancel: noop }),
  );
  assert.ok(html.includes("Tên dịch vụ") && html.includes("Mốc bắt đầu muộn nhất") && html.includes("Loài áp dụng"));
  assert.ok(html.includes("Phải là một mốc giờ trong cấu hình."));
  assert.equal(count(html, /<option value="\d\d:00"/g), 11);
  assert.equal(count(html, /type="checkbox"[^>]*checked=""/g), 2);
  // Chó 3 nhóm + Mèo 3 nhóm = 6 dòng giá; Thỏ, Chuột lang không hiện.
  assert.equal(count(html, /aria-label="Giá \(đ\), nhóm /g), 6);
  // Giá trị ban đầu do React Hook Form gán qua ref khi mount, không có trong HTML render phía server (xem service-forms.test).
  assert.ok(html.includes('aria-label="Giá (đ), nhóm Lớn của Chó"'));
  assert.ok(!html.includes('aria-label="Giá (đ), nhóm Nhỏ của Thỏ"'));
  assert.ok(!html.includes('role="alert"'));
  assert.ok(!/<button[^>]*type="submit"[^>]*disabled=""/.test(html));
  assert.ok(html.includes("Hủy bỏ") && html.includes("Lưu dịch vụ"));
  assert.ok(html.includes("Số nhân viên là 1 hoặc 2; bé khó tính luôn cần tối thiểu 2."));
});

test("form thêm mới: chưa có bảng giá; không có cảnh báo thiếu giá", () => {
  const html = renderToStaticMarkup(
    React.createElement(ServiceForm, { slotTimes: MOCK_SLOT_TIMES, onSubmit: noop, onCancel: noop }),
  );
  assert.equal(count(html, /aria-label="Giá \(đ\), nhóm /g), 0);
  assert.equal(count(html, /type="checkbox"/g), 4);
  assert.ok(!html.includes('role="alert"'));
});
