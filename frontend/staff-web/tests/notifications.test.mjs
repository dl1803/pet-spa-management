import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationItem } from "../components/domain/notification-item.tsx";
import { NotificationsScreen } from "../features/notifications/screens/notifications-screen.tsx";
import { MOCK_NOTIFICATIONS } from "../features/notifications/mock-data.ts";
import { NOTIFICATIONS_PAGE_SIZE, getNextNotificationPage, notificationKeys } from "../lib/queries/notifications.ts";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const render = (notification, todayKey = "2026-10-06") =>
  renderToStaticMarkup(React.createElement(NotificationItem, { notification, todayKey, onRead: noop }));

test("dữ liệu mô phỏng: 3 thông báo phân công và 1 thông báo hủy, đúng 1 chưa đọc", () => {
  assert.deepEqual(MOCK_NOTIFICATIONS.map((item) => item.type), ["ConfirmedAssigned", "ConfirmedAssigned", "ConfirmedAssigned", "Cancelled"]);
  assert.equal(MOCK_NOTIFICATIONS.filter((item) => !item.isRead).length, 1);
  assert.ok(MOCK_NOTIFICATIONS.every((item) => item.message.length <= 500 && item.appointmentId));
});

test("phân công chưa đọc: tiêu đề có mã lịch, chấm chưa đọc, có nút bên trong phần tử bọc, thời gian trong ngày chỉ có giờ", () => {
  const html = render(MOCK_NOTIFICATIONS[0]);
  assert.match(html, /^<div[^>]*tabindex="-1"/);
  assert.match(html, /<button type="button"/);
  assert.match(html, /Bạn được phân công lịch LH-1041A0B2/);
  assert.match(html, /\(chưa đọc\)/);
  assert.match(html, /Xíu, chó Chihuahua\. Thứ tư 07\/10, 09:00 – 10:20\. Tắm &amp; sấy lông, Vệ sinh tai &amp; cắt móng\./);
  assert.match(html, /<time dateTime="2026-10-06T08:12:00\+07:00"[^>]*>08:12<\/time>/);
  assert.match(html, /bg-st-confirmed-bg text-st-confirmed/);
});

test("phân công đã đọc: phần tử bọc không có chấm hoặc nút", () => {
  const html = render(MOCK_NOTIFICATIONS[1]);
  assert.match(html, /^<div[^>]*tabindex="-1"/);
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(html, /chưa đọc/);
  assert.match(html, /Bạn được phân công lịch LH-1030C4D5/);
  assert.match(html, />04\/10, 17:05</);
});

test("thông báo hủy: tiêu đề Lịch <mã> đã hủy, biểu tượng và nền trạng thái Đã hủy, lý do nằm trong nội dung", () => {
  const html = render(MOCK_NOTIFICATIONS[3]);
  assert.match(html, /Lịch LH-09958A9B đã hủy/);
  assert.match(html, /Lý do: vắng mặt quá 15 phút sau giờ hẹn\./);
  assert.match(html, /bg-st-cancelled-bg text-st-cancelled/);
});

test("thiếu appointmentId vẫn có tiêu đề; loại ngoài phạm vi nhân viên spa dùng tiêu đề dự phòng", () => {
  const base = { notificationId: "n", message: "Nội dung", isRead: true, createdAt: "2026-10-06T08:12:00+07:00" };
  assert.match(render({ ...base, type: "ConfirmedAssigned", appointmentId: null }), /Bạn được phân công lịch hẹn/);
  assert.match(render({ ...base, type: "Cancelled" }), /Lịch hẹn đã hủy/);
  assert.match(render({ ...base, type: "PaymentRecorded", appointmentId: null }), />Thông báo</);
});

test("nội dung thông báo được escape", () => {
  const html = render({ ...MOCK_NOTIFICATIONS[1], message: "<script>alert(1)</script>" });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

// Dữ liệu API đặt sẵn vào bộ nhớ đệm của TanStack Query; render phía máy chủ không gọi API.
function renderScreen(pages) {
  const client = new QueryClient();
  if (pages) client.setQueryData(notificationKeys.list(NOTIFICATIONS_PAGE_SIZE), { pages, pageParams: pages.map((_, index) => index + 1) });
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(NotificationsScreen)));
}
const page = (items, extra = {}) => ({ items, page: 1, pageSize: NOTIFICATIONS_PAGE_SIZE, total: items.length, unread: 1, ...extra });

test("màn thông báo: tiêu đề, mô tả, 4 thông báo từ API, không có tab", () => {
  const html = renderScreen([page(MOCK_NOTIFICATIONS)]);
  assert.match(html, /<h1>Thông báo<\/h1>/);
  assert.match(html, /Phân công và thay đổi về lịch hẹn của bạn\./);
  assert.equal(count(html, /<li>/g), 4);
  assert.equal(count(html, /\(chưa đọc\)/g), 1);
  assert.doesNotMatch(html, /role="tablist"/);
  assert.doesNotMatch(html, /Xem thêm/);
});

test("màn thông báo: đang tải lần đầu hiện khung xương, chưa có dòng thông báo", () => {
  const html = renderScreen(null);
  assert.match(html, /role="status"[^>]*aria-busy="true"/);
  assert.match(html, /Đang tải thông báo…/);
  assert.equal(count(html, /<li>/g), 0);
});

test("màn thông báo: danh sách rỗng hiện Chưa có thông báo nào", () => {
  const html = renderScreen([page([], { unread: 0 })]);
  assert.match(html, /Chưa có thông báo nào/);
  assert.equal(count(html, /<li>/g), 0);
});

test("màn thông báo: còn trang sau thì có Xem thêm; gộp theo notificationId khi hai trang trùng dòng", () => {
  const first = page(MOCK_NOTIFICATIONS.slice(0, 3), { total: 45 });
  const second = page(MOCK_NOTIFICATIONS.slice(2), { page: 2, total: 45 });
  const html = renderScreen([first, second]);
  assert.equal(count(html, /<li>/g), 4);
  const more = renderScreen([first]);
  assert.match(more, /Xem thêm/);
  assert.equal(count(more, /<li>/g), 3);
});

test("trang kế tiếp: còn thông báo chưa tải thì +1, hết thì undefined", () => {
  assert.equal(getNextNotificationPage({ items: [], page: 1, pageSize: 20, total: 21, unread: 0 }), 2);
  assert.equal(getNextNotificationPage({ items: [], page: 2, pageSize: 20, total: 40, unread: 0 }), undefined);
  assert.equal(getNextNotificationPage({ items: [], page: 1, pageSize: 20, total: 0, unread: 0 }), undefined);
});
