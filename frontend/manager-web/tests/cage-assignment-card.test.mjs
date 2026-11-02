import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmDialog } from "../components/ui/confirm-dialog.tsx";
import { CageAssignmentCard } from "../features/pending/components/cage-assignment-card.tsx";
import { PendingEmptyState } from "../features/pending/components/pending-empty-state.tsx";
import { formatAppointmentCode } from "../lib/format.ts";
import { MOCK_CAGE_ASSIGNMENTS } from "../features/pending/mock-data.ts";

const noop = () => {};
const may = MOCK_CAGE_ASSIGNMENTS[0];
const renderCard = (props = {}) =>
  renderToStaticMarkup(React.createElement(CageAssignmentCard, { ...may, onConfirm: noop, onReject: noop, ...props }));

test("thẻ lưu trú: tiêu đề, khối chuồng, nút từ chối và xác nhận; chưa mở hộp thoại", () => {
  const html = renderCard();
  assert.ok(html.includes("Mây, mèo Xiêm, nhóm Vừa"));
  assert.ok(html.includes("Chuồng phù hợp mèo nhóm Vừa"));
  assert.ok(html.includes("Từ chối: cửa hàng không thể đáp ứng"));
  assert.ok(html.includes("Xác nhận lịch lưu trú"));
  assert.ok(html.indexOf("Từ chối: cửa hàng") < html.indexOf("Xác nhận lịch lưu trú"));
  assert.ok(!html.includes("<dialog"));
});

test("đầu thẻ (vùng 3): mã lịch, khách, SĐT, có tài khoản, badge Chờ xác nhận", () => {
  const html = renderCard();
  assert.ok(html.includes("LH-5F1C2A9B. Lý Ngọc Hân, 0935 470 218, có tài khoản"));
  assert.ok(html.includes("Chờ xác nhận"));
  assert.ok(renderCard({ hasAccount: false }).includes("khách vãng lai"));
});

test("thông tin lịch (vùng 4): Nhận, Trả kèm số đêm, Tạm tính kèm công thức", () => {
  const html = renderCard();
  assert.ok(html.includes("09:00, thứ năm 08/10"));
  assert.ok(html.includes("17:00, thứ bảy 10/10"));
  assert.ok(html.includes("2 đêm: 08/10, 09/10"));
  assert.ok(html.includes("420.000đ"));
  assert.ok(html.includes("2 × (170.000đ + 40.000đ)"));
});

test("nút xác nhận mở khi có chuồng chọn được; khóa kèm lý do khi không có chuồng nào", () => {
  const enabled = renderCard();
  assert.ok(!/<button[^>]*disabled=""[^>]*>Xác nhận lịch lưu trú/.test(enabled));
  assert.ok(!enabled.includes("Chưa có chuồng phù hợp để chọn."));
  const noCage = renderCard({ suggestions: { cage: may.cages[1] }, cages: [may.cages[3]] });
  assert.ok(/<button[^>]*disabled=""[^>]*>Xác nhận lịch lưu trú/.test(noCage));
  assert.ok(noCage.includes("Chưa có chuồng phù hợp để chọn."));
});

test("hộp thoại xác nhận: tone danger đổi màu biểu tượng, mặc định vẫn là warn", () => {
  const render = (props) => renderToStaticMarkup(
    React.createElement(ConfirmDialog, { icon: "x-circle", title: "T", description: "D", confirmLabel: "Đồng ý", onConfirm: noop, onCancel: noop, ...props }),
  );
  assert.ok(render({ tone: "danger" }).includes("bg-danger-50 text-danger"));
  assert.ok(render({}).includes("bg-apricot-50 text-apricot-700"));
});

test("trạng thái trống khi hết lịch chờ xác nhận", () => {
  assert.ok(renderToStaticMarkup(React.createElement(PendingEmptyState)).includes("Không còn lịch chờ xác nhận."));
});

test("mã lịch hẹn rút gọn từ appointmentId", () => {
  assert.equal(formatAppointmentCode("5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03"), "LH-5F1C2A9B");
});
