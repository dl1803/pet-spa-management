import assert from "node:assert/strict";
import test from "node:test";

const baseURL = "http://localhost:3002";

test("khung quản lý chỉ liên kết tới trang đã có", async () => {
  const response = await fetch(baseURL);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="vi"/);
  assert.match(html, /<h1>Web Quản lý<\/h1>/);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.match(html, /href="#main-content"/);

  // React stream gửi fallback trước; menu cuối là nội dung đã giải quyết Suspense.
  const navigation = [...html.matchAll(/<nav\b[^>]*aria-label="Menu quản lý"[\s\S]*?<\/nav>/g)].at(-1)?.[0];
  assert.ok(navigation, "Thiếu menu quản lý");
  assert.equal((navigation.match(/<a\b/g) ?? []).length, 1);
  assert.match(navigation, /<a\b[^>]*aria-current="page"[^>]*>[\s\S]*?Tổng quan<\/a>/);
  assert.equal((navigation.match(/aria-disabled="true"/g) ?? []).length, 9);
  assert.match(html, /<button\b[^>]*disabled=""[^>]*aria-label="Đăng xuất"/);

  // Theo mọi liên kết trang thực sự hiển thị để phát hiện đích 404 trong shell.
  for (const [, href] of html.matchAll(/<a\b[^>]*href="(\/[^"#]*)"/g)) {
    assert.equal((await fetch(new URL(href, baseURL))).status, 200, href);
  }
});

test("icon được phục vụ và đường dẫn lạ trả 404", async () => {
  const icon = await fetch(`${baseURL}/icon.svg`);
  assert.equal(icon.status, 200);
  assert.match(icon.headers.get("content-type"), /image\/svg\+xml/);
  assert.equal((await fetch(`${baseURL}/__shell-smoke-not-found__`)).status, 404);
});
