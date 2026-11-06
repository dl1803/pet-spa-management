import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { ExecutionWorkspace } from "../features/service-execution/components/execution-workspace.tsx";
import { MOCK_APPOINTMENT_IDS, createMockExecutions, findMockExecution } from "../features/service-execution/mock-data.ts";

const NOW = new Date("2026-11-06T02:00:00Z"); // 09:00 ngày 06/11/2026 ở cửa hàng
const TODAY = "2026-11-06";
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const byId = (id) => findMockExecution(createMockExecutions(NOW), id);
// Hạn xác nhận chi phí tính từ giờ thật để đồng hồ đếm ngược hiện khoảng 27 phút.
const liveById = (id) => findMockExecution(createMockExecutions(new Date()), id);
const hasDisabledAttribute = (html) => /\sdisabled=""/.test(html);
const render = (data) =>
  renderToStaticMarkup(
    React.createElement(ToastProvider, null, React.createElement(ExecutionWorkspace, { initial: data, todayKey: TODAY })),
  );
const photo = (kind, uploadedAt, photoId = `p-${kind}-${uploadedAt}`) => ({ photoId, kind, url: "blob:x", uploadedAt });

test("màn: chưa đủ điều kiện bắt đầu (Received, chờ xác nhận chi phí, chưa có ảnh trước)", () => {
  const html = render(liveById(MOCK_APPOINTMENT_IDS.blocked));
  assert.match(html, /<h1>Bông, chó Poodle<\/h1>/);
  assert.match(html, /Đã tiếp nhận/);
  assert.match(html, /LH-1029A001\. Khách Trần Minh Anh\. 09:00 – 11:00\. Hồ sơ nhóm Nhỏ, đang chờ khách xác nhận lên Vừa\./);
  assert.match(html, /Lưu ý từ hồ sơ:<\/b> dị ứng nhẹ với sữa tắm có mùi; hơi sợ máy sấy\. Tính cách bình thường\. Lông xoăn, màu kem\./);
  assert.match(html, /Chưa hợp lệ/);
  assert.match(html, /Lịch này chưa có ảnh trước chăm sóc\. Cần chụp ảnh mới\./);
  assert.match(html, /Chụp hoặc chọn ảnh trước chăm sóc/);
  assert.match(html, /Chưa thể tải ảnh sau/);
  assert.match(html, /Tải được khi lịch đang thực hiện\./);
  assert.match(html, /0 \/ 2 xong/);
  assert.match(html, /Đang chờ khách xác nhận chi phí mới \(Nhỏ → Vừa\), còn/);
  assert.match(html, /role="timer"[^>]*>2[67]:\d\d<\/span>/);
  assert.match(html, /<button type="button"[^>]*\sdisabled=""[^>]*aria-describedby="start-blockers"[^>]*>[\s\S]*?Bắt đầu thực hiện/);
  assert.match(html, /Cần ảnh trước chăm sóc hợp lệ\./);
  assert.match(html, /Đang chờ khách xác nhận chi phí mới\.<\/li>/);
  assert.equal(count(html, /Đánh dấu xong<\/button>/g), 2);
  assert.equal(count(html, /<button type="submit"[^>]*\sdisabled=""/g), 2);
  assert.doesNotMatch(html, /Hoàn tất lịch hẹn/);
  assert.doesNotMatch(html, /<textarea/);
});

test("màn: đủ điều kiện bắt đầu (có ảnh trước, nút bật, không có lý do khóa)", () => {
  const html = render(byId(MOCK_APPOINTMENT_IDS.ready));
  assert.match(html, /<h1>Na, mèo Mèo Anh lông ngắn<\/h1>/);
  assert.match(html, /Hợp lệ/);
  assert.doesNotMatch(html, /Chưa hợp lệ/);
  assert.match(html, /alt="Ảnh trước chăm sóc của Na"/);
  assert.match(html, /<span[^>]*>Trước<\/span>/);
  assert.match(html, /09:\d\d hôm nay|\d\d:\d\d hôm nay/);
  assert.match(html, /Nhóm Nhỏ \(cân thực tế 4,2 kg\)\./);
  const startButton = html.match(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Bắt đầu thực hiện<\/button>/)?.[0] ?? "";
  assert.ok(startButton.length > 0);
  assert.equal(hasDisabledAttribute(startButton), false);
  assert.doesNotMatch(html, /id="start-blockers"/);
  assert.doesNotMatch(html, /role="timer"/);
});

test("màn: đang thực hiện (dịch vụ xong có giờ và ghi chú, ô ghi chú, không có nút bắt đầu hay hoàn tất)", () => {
  const html = render(byId(MOCK_APPOINTMENT_IDS.inProgress));
  assert.match(html, /Đang thực hiện/);
  assert.match(html, /1 \/ 2 xong/);
  assert.match(html, /Xong lúc \d\d:\d\d/);
  assert.match(html, /Da hơi khô vùng lưng, đã dùng sữa tắm không mùi\./);
  assert.match(html, /Đang làm/);
  assert.match(html, /Ghi chú <span[^>]*>\(không bắt buộc\)<\/span>/);
  assert.equal(count(html, /<textarea/g), 1);
  const markDone = html.match(/<button[^>]*type="submit"[^>]*>(?:(?!<\/button>)[\s\S])*Đánh dấu xong<\/button>/)?.[0] ?? "";
  assert.ok(markDone.length > 0);
  assert.equal(hasDisabledAttribute(markDone), false);
  assert.match(html, /Chụp ảnh sau khi xong mọi dịch vụ/);
  assert.doesNotMatch(html, /Chưa thể tải ảnh sau/);
  assert.doesNotMatch(html, /Bắt đầu thực hiện/);
  assert.doesNotMatch(html, /Hoàn tất lịch hẹn/);
  assert.doesNotMatch(html, /role="timer"/);
});

test("màn: có ảnh sau thì hiện ảnh nhãn Sau và thẻ Đã có, không còn ô tải", () => {
  const base = byId(MOCK_APPOINTMENT_IDS.inProgress);
  const html = render({ ...base, photos: [...base.photos, photo("After", "2026-11-06T06:00:00Z")] });
  assert.match(html, /alt="Ảnh sau chăm sóc của Lu"/);
  assert.match(html, /Đã có/);
  assert.doesNotMatch(html, /Chụp ảnh sau khi xong mọi dịch vụ/);
});

test("màn: trạng thái ngoài Received/InProgress không có thao tác nào", () => {
  const base = byId(MOCK_APPOINTMENT_IDS.ready);
  const html = render({ ...base, appointment: { ...base.appointment, status: "Completed" } });
  assert.match(html, /Hoàn tất/);
  assert.doesNotMatch(html, /Bắt đầu thực hiện/);
  assert.doesNotMatch(html, /<textarea/);
  assert.match(html, /Chưa thể tải ảnh sau/);
});

test("màn: nội dung nhập từ dữ liệu được escape", () => {
  const base = byId(MOCK_APPOINTMENT_IDS.blocked);
  const html = render({ ...base, pet: { ...base.pet, notes: "<script>alert(1)</script>" } });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
