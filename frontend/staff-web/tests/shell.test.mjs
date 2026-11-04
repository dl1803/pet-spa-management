import assert from "node:assert/strict";
import test from "node:test";

const baseURL = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");

async function get(url) {
  try {
    return await fetch(url);
  } catch (error) {
    throw new Error(`Không kết nối được ${baseURL}. Chạy "npm run build" rồi "npm run start -- --port 3001" ở terminal khác trước.`, { cause: error });
  }
}

test("khung nhân viên hiển thị trang chủ và chưa lộ menu khi chưa có vai trò", async () => {
  const response = await get(baseURL);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="vi"/);
  assert.match(html, /<h1>Web Nhân viên<\/h1>/);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.match(html, /href="#main-content"/);
  assert.match(html, /Web nhân viên/);
  assert.match(html, /Chưa đăng nhập/);
  assert.doesNotMatch(html, /aria-label="Menu nhân viên"/);

  // Theo mọi liên kết trang thực sự hiển thị để phát hiện đích 404 trong shell.
  for (const [, href] of html.matchAll(/<a\b[^>]*href="(\/[^"#]*)"/g)) {
    assert.equal((await get(new URL(href, baseURL))).status, 200, href);
  }
});

test("icon được phục vụ và đường dẫn lạ trả 404", async () => {
  const icon = await get(`${baseURL}/icon.svg`);
  assert.equal(icon.status, 200);
  assert.match(icon.headers.get("content-type"), /image\/svg\+xml/);
  assert.equal((await get(`${baseURL}/__shell-smoke-not-found__`)).status, 404);
});
