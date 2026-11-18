import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffScreenFallback } from "../features/staff/components/staff-screen-fallback.tsx";

// StaffScreen dùng next/navigation, TanStack Query và toast nên không render được bằng renderToStaticMarkup (không có Next/DOM).
// Lớp gọi API được kiểm tra ở staff-api.test.mjs, kết quả vô hiệu hóa ở staff-deactivation.test.mjs,
// lọc và đếm ở staff-forms.test.mjs; bảng và biểu mẫu ở staff-components.test.mjs, staff-form.test.mjs.

test("khung chờ của Suspense: có tiêu đề Nhân viên và thông báo đang tải, không chứa dữ liệu nhân viên", () => {
  const html = renderToStaticMarkup(React.createElement(StaffScreenFallback));
  assert.ok(html.includes("<h1>Nhân viên</h1>"));
  assert.match(html, /role="status"[^>]*>Đang tải danh sách nhân viên…/);
  assert.match(html, /aria-busy="true"/);
  assert.ok(!html.includes("<table") && !html.includes("Thêm nhân viên"));
});
