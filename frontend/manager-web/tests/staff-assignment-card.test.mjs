import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaffAssignmentCard } from "../features/pending/components/staff-assignment-card.tsx";
import { MOCK_STAFF_ASSIGNMENTS } from "../features/pending/mock-data.ts";

const noop = () => {};
const [mochi, dau, lu] = MOCK_STAFF_ASSIGNMENTS;
const renderCard = (assignment, props = {}) =>
  renderToStaticMarkup(React.createElement(StaffAssignmentCard, { ...assignment, onConfirm: noop, onReject: noop, ...props }));

test("đầu thẻ (vùng 3): tiêu đề, mã lịch, khách, SĐT, có tài khoản, badge Chờ xác nhận", () => {
  const html = renderCard(mochi);
  assert.ok(html.includes("Mochi, mèo Anh lông ngắn, nhóm Vừa"));
  assert.ok(html.includes("LH-5F1C2A9B. Trần Minh Anh, 0903 412 678, có tài khoản"));
  assert.ok(html.includes("Chờ xác nhận"));
  assert.ok(renderCard({ ...mochi, hasAccount: false }).includes("khách vãng lai"));
});

test("lịch mới đặt (vùng 4): dịch vụ, khung giờ kèm giữ chỗ, tạm tính; không có alert lý do", () => {
  const html = renderCard(mochi);
  assert.ok(html.includes("Tắm &amp; sấy lông, Cắt tỉa lông"));
  assert.ok(html.includes("14:00 – 16:00, 06/10"));
  assert.ok(html.includes("Giữ chỗ đến 16:15 gồm dọn dẹp"));
  assert.ok(html.includes("Tạm tính") && html.includes("330.000đ"));
  assert.ok(!html.includes("Số tiền mới"));
  assert.ok(!html.includes("data-tone="));
});

test("khách đã đổi lịch (vùng 7): alert info, số tiền mới và số tiền trước đó lấy từ dữ liệu", () => {
  const html = renderCard(dau);
  assert.ok(html.includes('data-tone="info"'));
  assert.ok(html.includes("Khách đã đổi lịch lúc 20:30 ngày 05/10"));
  assert.ok(html.includes("Từ 06/10 15:00 (Cắt tỉa lông) sang 07/10 10:00 (Cắt tỉa lông, Vệ sinh tai &amp; cắt móng)."));
  assert.ok(html.includes("Khi xác nhận, số tiền tính lại: <b") && html.includes("180.000đ</b> (trước khi đổi 120.000đ)."));
  assert.ok(html.includes("Số tiền mới") && !html.includes("Tạm tính"));
  const changed = renderCard({ ...dau, amount: 777000, pendingReason: { ...dau.pendingReason, previousAmount: 555000 } });
  assert.ok(changed.includes("777.000đ") && changed.includes("trước khi đổi 555.000đ"));
  assert.ok(!changed.includes("222.000đ"));
});

test("nhân viên bị vô hiệu hóa (vùng 7): alert warn nêu phân công cũ đã gỡ; vãng lai không nêu đã nhận thông báo", () => {
  const html = renderCard(lu);
  assert.ok(html.includes('data-tone="warn"'));
  assert.ok(html.includes("Cần phân công lại"));
  assert.ok(html.includes("Nhân viên Phúc bị vô hiệu hóa lúc 18:00 ngày 05/10."));
  assert.ok(html.includes("phân công cũ (Hạnh, Phúc) đã được gỡ. Khách hàng đã nhận thông báo."));
  assert.ok(html.includes("Tạm tính") && html.includes("240.000đ"));
  assert.ok(!renderCard({ ...lu, hasAccount: false }).includes("Khách hàng đã nhận thông báo."));
});

test("alert lý do đứng trước thông tin lịch và danh sách nhân viên", () => {
  const html = renderCard(lu);
  assert.ok(html.indexOf("Cần phân công lại") < html.indexOf("Dịch vụ"));
  assert.ok(html.indexOf("Dịch vụ") < html.indexOf("Nhân viên spa phụ trách"));
});

test("chân thẻ (vùng 6): từ chối đứng trước xác nhận; chưa mở hộp thoại", () => {
  const html = renderCard(mochi);
  assert.ok(html.includes("Từ chối: cửa hàng không thể đáp ứng"));
  assert.ok(html.includes("Xác nhận lịch hẹn"));
  assert.ok(html.indexOf("Từ chối: cửa hàng") < html.indexOf("Xác nhận lịch hẹn"));
  assert.ok(!html.includes("<dialog"));
});

test("nút xác nhận mở khi đủ nhân viên đề xuất; khóa khi không có nhân viên nào để chọn", () => {
  assert.ok(!/<button[^>]*disabled=""[^>]*>Xác nhận lịch hẹn/.test(renderCard(mochi)));
  assert.ok(!/<button[^>]*disabled=""[^>]*>Xác nhận lịch hẹn/.test(renderCard(lu)));
  const empty = renderCard({ ...mochi, suggestions: { staffRequired: 1, suggested: [], alternatives: [] } });
  assert.ok(/<button[^>]*disabled=""[^>]*>Xác nhận lịch hẹn/.test(empty));
  assert.ok(empty.includes("Lịch này cần đúng 1 nhân viên."));
});

test("tên, dịch vụ có ký tự HTML được escape", () => {
  const html = renderCard({ ...mochi, title: "<script>x</script>", serviceNames: ["<b>Tắm</b>"] });
  assert.ok(!html.includes("<script>") && !html.includes("<b>Tắm</b>"));
});
