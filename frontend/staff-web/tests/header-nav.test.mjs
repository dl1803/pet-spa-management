import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HeaderNav } from "../components/layout/header-nav.tsx";

const render = (role, pathname = null) =>
  renderToStaticMarkup(React.createElement(HeaderNav, { role, pathname }));

function menuLabels(html) {
  const nav = html.match(/<nav\b[^>]*aria-label="Menu nhân viên"[\s\S]*?<\/nav>/)?.[0] ?? "";
  return [...nav.matchAll(/<span class="max-\[640px\]:sr-only">([^<]+)<\/span>/g)].map((match) => match[1]);
}

test("chưa có vai trò: không hiện menu, thông báo hay menu tài khoản", () => {
  const html = render(null);
  assert.deepEqual(menuLabels(html), []);
  assert.doesNotMatch(html, /aria-label="Thông báo"/);
  assert.match(html, /Chưa đăng nhập/);
  assert.doesNotMatch(html, /aria-expanded/);
});

test("Lễ tân thấy 7 mục theo đúng thứ tự, không có thông báo", () => {
  const html = render("Receptionist");
  assert.deepEqual(menuLabels(html), [
    "Lịch hẹn",
    "Tiếp nhận",
    "Trả thú cưng",
    "Khách hàng",
    "Đặt lịch thay",
    "Chuồng",
    "Thanh toán",
  ]);
  assert.doesNotMatch(html, /Lịch sử công việc/);
  assert.doesNotMatch(html, /aria-label="Thông báo"/);
  assert.match(html, /Lễ tân/);
  assert.match(html, /Hồ sơ cá nhân/);
  assert.match(html, /Danh mục dịch vụ/);
  assert.match(html, /Đăng xuất/);
});

test("Nhân viên spa thấy 3 mục và thông báo, không có mục của Lễ tân", () => {
  const html = render("SpaStaff");
  assert.deepEqual(menuLabels(html), ["Lịch hẹn", "Lịch sử công việc", "Dịch vụ"]);
  assert.match(html, /aria-label="Thông báo"/);
  assert.match(html, /Nhân viên spa/);
  assert.match(html, /Hồ sơ cá nhân/);
  assert.doesNotMatch(html, /Danh mục dịch vụ/);
  assert.doesNotMatch(html, /Tiếp nhận|Thanh toán|Đặt lịch thay/);
});

// Trang đích đã có theo vai trò. Khi người làm trang mới bật `available` trong header-nav.tsx thì thêm đường dẫn vào đây.
const AVAILABLE_HREFS = {
  Receptionist: ["/tiep-nhan", "/khach-hang", "/dat-lich", "/thanh-toan"],
  SpaStaff: ["/lich-su-cong-viec", "/thong-bao"],
};

test("chỉ mục đã có trang đích là liên kết; mục còn lại bị vô hiệu hóa, không dẫn tới 404", () => {
  for (const role of ["Receptionist", "SpaStaff"]) {
    const html = render(role, "/lich-hen");
    const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((match) => match[1]);
    assert.deepEqual(hrefs, AVAILABLE_HREFS[role]);
    assert.match(html, /aria-disabled="true"/);
    assert.match(html, /Chức năng chưa khả dụng/);
    assert.match(html, /<button\b[^>]*disabled=""[^>]*>[\s\S]*?Đăng xuất/);
  }
});

test("Nhân viên spa: Lịch sử công việc và Thông báo đánh dấu aria-current khi đang ở trang đó", () => {
  const history = render("SpaStaff", "/lich-su-cong-viec");
  assert.match(history, /<a\b[^>]*aria-current="page"[^>]*href="\/lich-su-cong-viec"/);
  assert.doesNotMatch(history, /<a\b[^>]*aria-label="Thông báo"[^>]*aria-current/);

  const notifications = render("SpaStaff", "/thong-bao");
  assert.match(notifications, /<a\b[^>]*aria-label="Thông báo"[^>]*aria-current="page"/);
  assert.doesNotMatch(notifications, /<a\b[^>]*aria-current="page"[^>]*href="\/lich-su-cong-viec"/);
});

test("Lễ tân: Thanh toán là liên kết và đánh dấu aria-current khi đang ở trang đó", () => {
  const html = render("Receptionist", "/thanh-toan");
  assert.match(html, /<a\b[^>]*aria-current="page"[^>]*href="\/thanh-toan"/);
  assert.doesNotMatch(html, /<a\b[^>]*aria-current="page"[^>]*href="\/tiep-nhan"/);
});
