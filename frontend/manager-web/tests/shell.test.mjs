import assert from "node:assert/strict";
import test from "node:test";

const baseURL = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3002").replace(/\/+$/, "");
// Cookie phiên giả: proxy chỉ kiểm tra có cookie hay không, nên đủ để vào khung sau đăng nhập mà không cần backend.
const SESSION_COOKIE = { cookie: "ps_manager_rt=smoke" };

async function get(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(`Không kết nối được ${baseURL}. Chạy "npm run build" rồi "npm run start -- --port 3002" ở terminal khác trước.`, { cause: error });
  }
}

// Vị trí chuyển hướng dạng đường dẫn + query (server production trả Location tương đối, dev trả tuyệt đối).
function redirectTarget(response) {
  const url = new URL(response.headers.get("location"), baseURL);
  return url.pathname + url.search;
}

test("chưa đăng nhập: mọi màn chuyển về /dang-nhap kèm đường dẫn đang mở", async () => {
  const response = await get(`${baseURL}/lich-hen?date=2026-11-14`, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(redirectTarget(response), "/dang-nhap?next=%2Flich-hen%3Fdate%3D2026-11-14");

  const root = await get(baseURL, { redirect: "manual" });
  assert.equal(root.status, 307);
  assert.equal(redirectTarget(root), "/dang-nhap");
});

test("màn đăng nhập không dùng khung quản lý và không lộ menu", async () => {
  // Nội dung form dựng ở trình duyệt (đọc ?next=), nên ở đây chỉ kiểm phần vỏ HTML.
  const response = await get(`${baseURL}/dang-nhap`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="vi"/);
  assert.match(html, /<title>Web Quản lý \| Spa thú cưng<\/title>/);
  assert.doesNotMatch(html, /href="#main-content"/);
  assert.doesNotMatch(html, /aria-label="Menu quản lý"/);
});

test("đã có cookie phiên: rời màn đăng nhập; khung hiện chỗ chờ, nút Đăng xuất khóa tới khi có phiên", async () => {
  const login = await get(`${baseURL}/dang-nhap`, { headers: SESSION_COOKIE, redirect: "manual" });
  assert.equal(login.status, 307);
  assert.equal(redirectTarget(login), "/");

  const emptyCookie = await get(`${baseURL}/lich-hen`, { headers: { cookie: "ps_manager_rt=" }, redirect: "manual" });
  assert.equal(emptyCookie.status, 307);
  assert.equal(redirectTarget(emptyCookie), "/dang-nhap?next=%2Flich-hen");

  const response = await get(baseURL, { headers: SESSION_COOKIE });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<html[^>]*lang="vi"/);
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.match(html, /href="#main-content"/);
  // Nội dung màn chỉ hiện sau khi SessionGate có phiên (dựng ở trình duyệt).
  assert.match(html, /Đang tải phiên đăng nhập/);
  assert.doesNotMatch(html, /<h1>Tổng quan hôm nay<\/h1>/);
  assert.match(html, /<button\b[^>]*disabled=""[^>]*aria-label="Đăng xuất"/);

  // React stream gửi fallback trước; menu cuối là nội dung đã giải quyết Suspense.
  const navigation = [...html.matchAll(/<nav\b[^>]*aria-label="Menu quản lý"[\s\S]*?<\/nav>/g)].at(-1)?.[0];
  assert.ok(navigation, "Thiếu menu quản lý");
  assert.equal((navigation.match(/<a\b/g) ?? []).length, 6);
  assert.match(navigation, /<a\b[^>]*aria-current="page"[^>]*>[\s\S]*?Tổng quan<\/a>/);
  assert.match(navigation, /<a\b[^>]*href="\/cho-xac-nhan"[^>]*>[\s\S]*?Chờ xác nhận<\/a>/);
  assert.match(navigation, /<a\b[^>]*href="\/dich-vu"[^>]*>[\s\S]*?Dịch vụ<\/a>/);
  assert.match(navigation, /<a\b[^>]*href="\/chuong-va-gia"[^>]*>[\s\S]*?Chuồng &amp; giá<\/a>/);
  assert.match(navigation, /<a\b[^>]*href="\/nhan-vien"[^>]*>[\s\S]*?Nhân viên<\/a>/);
  assert.match(navigation, /<a\b[^>]*href="\/thanh-toan"[^>]*>[\s\S]*?Thanh toán<\/a>/);
  assert.equal((navigation.match(/aria-disabled="true"/g) ?? []).length, 4);

  // Theo mọi liên kết trang thực sự hiển thị để phát hiện đích 404 trong shell.
  for (const [, href] of html.matchAll(/<a\b[^>]*href="(\/[^"#]*)"/g)) {
    assert.equal((await get(new URL(href, baseURL), { headers: SESSION_COOKIE })).status, 200, href);
  }
});

test("route handler phiên từ chối yêu cầu không có Origin; icon được phục vụ; đường dẫn lạ trả 404", async () => {
  const noOrigin = await get(`${baseURL}/api/session/refresh`, { method: "POST" });
  assert.equal(noOrigin.status, 403);

  const icon = await get(`${baseURL}/icon.svg`);
  assert.equal(icon.status, 200);
  assert.match(icon.headers.get("content-type"), /image\/svg\+xml/);
  assert.equal((await get(`${baseURL}/__shell-smoke-not-found__`, { headers: SESSION_COOKIE })).status, 404);
});
