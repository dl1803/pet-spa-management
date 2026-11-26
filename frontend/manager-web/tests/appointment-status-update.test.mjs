import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "../lib/api/errors.ts";
import { StatusUpdateCard } from "../features/appointments/components/status-update-card.tsx";
import { findMockSpaAppointment } from "../features/appointments/evidence.ts";
import {
  STATUS_MESSAGES,
  classifyStatusUpdateError,
  describeNoStep,
  getSpaStatusStep,
  getStatusLockReasons,
} from "../features/appointments/status-update.ts";

const BONG = "5f1c0405-7e44-4c0a-9d21-0a1b2c3d4e00"; // Đã tiếp nhận, chờ xác nhận chi phí, chưa có ảnh
const MIT = "5f1c0406-7e44-4c0a-9d21-0a1b2c3d4e00"; // Đã xác nhận
const NAU = "5f1c0407-7e44-4c0a-9d21-0a1b2c3d4e00"; // Đang thực hiện, 1/2 dịch vụ xong, chưa có ảnh sau
const MUOC = "5f1c0409-7e44-4c0a-9d21-0a1b2c3d4e00"; // Đã tiếp nhận, có ảnh trước
const MOCHI = "5f1c040a-7e44-4c0a-9d21-0a1b2c3d4e00"; // Chờ xác nhận
const GAO = "5f1c03fc-7e44-4c0a-9d21-0a1b2c3d4e00"; // Hoàn tất

const noop = async () => {};
const mock = (id) => findMockSpaAppointment(id);
const renderCard = (id) => {
  const { appointment, photos } = mock(id);
  return renderToStaticMarkup(React.createElement(StatusUpdateCard, { appointment, photos, onAdvance: noop }));
};

// Lịch “Nâu” đủ điều kiện hoàn tất: mọi dịch vụ xong và có ảnh sau.
function readyToComplete() {
  const { appointment, photos } = mock(NAU);
  return {
    appointment: { ...appointment, services: [{ serviceId: "s1", isDone: true }] },
    photos: [...photos, { photoId: "p-after", kind: "After", url: "data:image/svg+xml,x", uploadedAt: "2026-10-06T09:19:00+07:00" }],
  };
}

test("getSpaStatusStep: chỉ Đã tiếp nhận và Đang thực hiện có bước kế tiếp", () => {
  assert.deepEqual(
    [getSpaStatusStep("Received").action, getSpaStatusStep("Received").to],
    ["start", "InProgress"],
  );
  assert.deepEqual(
    [getSpaStatusStep("InProgress").action, getSpaStatusStep("InProgress").to],
    ["complete", "Completed"],
  );
  for (const status of ["Pending", "Confirmed", "Completed", "Cancelled", "InStay"]) {
    assert.equal(getSpaStatusStep(status), null, status);
  }
});

test("getStatusLockReasons: theo dữ liệu mô phỏng", () => {
  const bong = mock(BONG);
  assert.deepEqual(getStatusLockReasons(getSpaStatusStep("Received"), bong.appointment, bong.photos), [
    STATUS_MESSAGES.beforePhotoRequired,
    STATUS_MESSAGES.costConfirmationPending,
  ]);
  const muoc = mock(MUOC);
  assert.deepEqual(getStatusLockReasons(getSpaStatusStep("Received"), muoc.appointment, muoc.photos), []);
  const nau = mock(NAU);
  assert.deepEqual(getStatusLockReasons(getSpaStatusStep("InProgress"), nau.appointment, nau.photos), [STATUS_MESSAGES.completionRequired]);
  const ready = readyToComplete();
  assert.deepEqual(getStatusLockReasons(getSpaStatusStep("InProgress"), ready.appointment, ready.photos), []);
});

test("classifyStatusUpdateError: lý do dưới nút, ErrorAlert cho lỗi còn lại", () => {
  const conflict = (code, detail) => new ApiError({ kind: "http", status: 409, code, detail });
  assert.deepEqual(classifyStatusUpdateError(conflict("PHOTO_REQUIRED"), "start"), { kind: "reason", message: STATUS_MESSAGES.beforePhotoRequired });
  assert.deepEqual(classifyStatusUpdateError(conflict("PHOTO_REQUIRED"), "complete"), { kind: "reason", message: STATUS_MESSAGES.completionRequired });
  assert.deepEqual(classifyStatusUpdateError(conflict("SERVICES_INCOMPLETE"), "complete"), { kind: "reason", message: STATUS_MESSAGES.completionRequired });
  assert.deepEqual(classifyStatusUpdateError(conflict("COST_CONFIRMATION_PENDING"), "start"), { kind: "reason", message: STATUS_MESSAGES.costConfirmationPending });

  const stale = classifyStatusUpdateError(conflict("INVALID_TRANSITION"), "start");
  assert.equal(stale.kind, "error");
  assert.equal(stale.error.detail, STATUS_MESSAGES.stale);
  assert.equal(classifyStatusUpdateError(conflict("INVALID_TRANSITION", "Đã đổi."), "start").error.detail, "Đã đổi.");

  const server = new ApiError({ kind: "http", status: 500 });
  assert.deepEqual(classifyStatusUpdateError(server, "start"), { kind: "error", error: server });
});

test("describeNoStep: câu theo trạng thái", () => {
  assert.ok(describeNoStep("Pending").includes("chờ xác nhận"));
  assert.ok(describeNoStep("Confirmed").includes("chưa được tiếp nhận"));
  assert.ok(describeNoStep("Completed").includes("đã hoàn tất"));
  assert.ok(describeNoStep("Cancelled").includes("đã hủy"));
});

test("StatusUpdateCard: nút bật khi đủ điều kiện, khóa kèm lý do khi thiếu", () => {
  const muoc = renderCard(MUOC);
  assert.ok(muoc.includes("Cập nhật trạng thái") && muoc.includes("Bắt đầu thực hiện") && muoc.includes(STATUS_MESSAGES.lifecycleNote));
  assert.ok(!/disabled=""/.test(muoc));
  assert.ok(!muoc.includes(STATUS_MESSAGES.beforePhotoRequired));

  const bong = renderCard(BONG);
  assert.match(bong, /<button[^>]*disabled=""/);
  assert.ok(bong.includes(STATUS_MESSAGES.beforePhotoRequired) && bong.includes(STATUS_MESSAGES.costConfirmationPending));

  const nau = renderCard(NAU);
  assert.match(nau, /<button[^>]*disabled=""/);
  assert.ok(nau.includes("Chuyển sang Hoàn tất") && nau.includes(STATUS_MESSAGES.completionRequired));
});

test("StatusUpdateCard: lịch chưa tiếp nhận, chờ xác nhận, hoàn tất không có nút", () => {
  for (const id of [MIT, MOCHI, GAO]) {
    const html = renderCard(id);
    assert.equal((html.match(/<button/g) ?? []).length, 0, id);
    assert.ok(html.includes("Cập nhật trạng thái"));
  }
  assert.ok(renderCard(MIT).includes(describeNoStep("Confirmed")));
  assert.ok(renderCard(GAO).includes(describeNoStep("Completed")));
});
