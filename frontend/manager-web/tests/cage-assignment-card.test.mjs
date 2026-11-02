import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmDialog } from "../components/ui/confirm-dialog.tsx";
import { CageAssignmentCard } from "../features/pending/components/cage-assignment-card.tsx";
import { formatAppointmentCode } from "../lib/format.ts";
import { MOCK_CAGE_ASSIGNMENTS } from "../features/pending/mock-data.ts";

const noop = () => {};
const may = MOCK_CAGE_ASSIGNMENTS[0];

test("thẻ lưu trú: tiêu đề, khối chuồng, nút từ chối và xác nhận; chưa mở hộp thoại", () => {
  const html = renderToStaticMarkup(
    React.createElement(CageAssignmentCard, { ...may, onConfirm: noop, onReject: noop }),
  );
  assert.ok(html.includes("Mây, mèo Xiêm, nhóm Vừa"));
  assert.ok(html.includes("Chuồng phù hợp mèo nhóm Vừa"));
  assert.ok(html.includes("Từ chối: cửa hàng không thể đáp ứng"));
  assert.ok(html.includes("Xác nhận lịch lưu trú"));
  assert.ok(html.indexOf("Từ chối: cửa hàng") < html.indexOf("Xác nhận lịch lưu trú"));
  assert.ok(!html.includes("<dialog"));
});

test("hộp thoại xác nhận: tone danger đổi màu biểu tượng, mặc định vẫn là warn", () => {
  const render = (props) => renderToStaticMarkup(
    React.createElement(ConfirmDialog, { icon: "x-circle", title: "T", description: "D", confirmLabel: "Đồng ý", onConfirm: noop, onCancel: noop, ...props }),
  );
  assert.ok(render({ tone: "danger" }).includes("bg-danger-50 text-danger"));
  assert.ok(render({}).includes("bg-apricot-50 text-apricot-700"));
});

test("mã lịch hẹn rút gọn từ appointmentId", () => {
  assert.equal(formatAppointmentCode("5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03"), "LH-5F1C2A9B");
});
