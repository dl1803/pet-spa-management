import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SidebarNav } from "../components/layout/sidebar-nav.tsx";
import { CagesScreenFallback } from "../features/cages/components/cages-screen-fallback.tsx";

const count = (html, pattern) => (html.match(pattern) ?? []).length;

// CagesScreen dùng next/navigation và toast nên không render được bằng renderToStaticMarkup (không có Next/DOM).
// Các thao tác của màn (thêm, sửa, ngừng, mở lại) nằm trong hàm thuần của mock-data.ts và đã được kiểm tra ở cage-forms.test.mjs.

test("khung chờ của Suspense: có tiêu đề Chuồng và giá lưu trú và thông báo đang tải, không chứa dữ liệu chuồng", () => {
  const html = renderToStaticMarkup(React.createElement(CagesScreenFallback));
  assert.ok(html.includes("<h1>Chuồng và giá lưu trú</h1>"));
  assert.match(html, /role="status"[^>]*>Đang tải chuồng và giá lưu trú…</);
  assert.match(html, /aria-busy="true"/);
  assert.ok(!html.includes("<table") && !html.includes("Thêm chuồng") && !html.includes("Lưu bảng giá"));
});

test("menu: Chuồng & giá và Khách bị khóa là liên kết; còn 3 mục chưa có trang bị khóa", () => {
  const html = renderToStaticMarkup(React.createElement(SidebarNav, { pathname: "/", pendingCount: null }));
  assert.equal(count(html, /<a\b/g), 7);
  assert.equal(count(html, /aria-disabled="true"/g), 3);
  assert.match(html, /<a\b[^>]*href="\/chuong-va-gia"[^>]*>[\s\S]*?Chuồng &amp; giá<\/a>/);
  assert.match(html, /<a\b[^>]*href="\/go-khoa-dat-lich"[^>]*>[\s\S]*?Khách bị khóa<\/a>/);
  for (const label of ["Lịch hẹn", "Lịch làm việc", "Cấu hình"]) {
    assert.match(html, new RegExp(`aria-disabled="true"[^>]*>[\\s\\S]*?${label}`), label);
  }
});

test("menu: đang ở /chuong-va-gia thì chỉ mục Chuồng & giá được đánh dấu trang hiện tại", () => {
  const html = renderToStaticMarkup(React.createElement(SidebarNav, { pathname: "/chuong-va-gia", pendingCount: null }));
  assert.equal(count(html, /aria-current="page"/g), 1);
  assert.match(html, /<a\b[^>]*aria-current="page"[^>]*href="\/chuong-va-gia"|<a\b[^>]*href="\/chuong-va-gia"[^>]*aria-current="page"/);
});

test("menu: pendingCount > 0 hiện huy hiệu số lượng trên mục Chờ xác nhận; bằng 0 hoặc null thì ẩn", () => {
  const withCount = renderToStaticMarkup(React.createElement(SidebarNav, { pathname: "/", pendingCount: 5 }));
  assert.ok(withCount.includes(">5<"));
  assert.ok(withCount.includes(", 5 lịch đang chờ"));

  const withZero = renderToStaticMarkup(React.createElement(SidebarNav, { pathname: "/", pendingCount: 0 }));
  assert.ok(!withZero.includes("lịch đang chờ"));
  assert.ok(!renderToStaticMarkup(React.createElement(SidebarNav, { pathname: "/", pendingCount: null })).includes("lịch đang chờ"));
});
