import assert from "node:assert/strict";
import test from "node:test";
import { classifySpaActionError } from "../features/pending/spa-action-error.ts";
import { getSpaAssignedMessage, getSpaRejectedMessage } from "../features/pending/spa-summary.ts";
import { ApiError } from "../lib/api/errors.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01";
const tam = { staffId: "a", fullName: "Lê Minh Tâm", recentAssignmentCount: 5 };
const hanh = { staffId: "b", fullName: "Nguyễn Thị Hạnh", recentAssignmentCount: 6 };
const http = (status, code, detail) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });

test("phân loại lỗi: ngoài ca mở hộp thoại và giữ detail của backend", () => {
  assert.deepEqual(classifySpaActionError(http(409, "STAFF_OUT_OF_SHIFT", "Nhân viên không có ca làm phủ khung giờ này: A."), 1), {
    kind: "out-of-shift",
    detail: "Nhân viên không có ca làm phủ khung giờ này: A.",
  });
});

test("phân loại lỗi: trùng lịch và sai số người dùng câu cố định, bỏ lựa chọn tay", () => {
  assert.deepEqual(classifySpaActionError(http(409, "STAFF_CONFLICT"), 2), {
    kind: "message", message: "Có nhân viên đã có lịch trùng khung giờ.", resetSelection: true,
  });
  assert.deepEqual(classifySpaActionError(http(409, "STAFF_COUNT_MISMATCH"), 2), {
    kind: "message", message: "Lịch này cần đúng 2 nhân viên.", resetSelection: true,
  });
});

test("phân loại lỗi: lịch không còn chờ hoặc không tìm thấy là lỗi cũ; còn lại hiện lỗi chung", () => {
  assert.equal(classifySpaActionError(http(409, "INVALID_TRANSITION"), 1).kind, "stale");
  assert.equal(classifySpaActionError(http(404, "NOT_FOUND"), 1).kind, "stale");
  for (const error of [http(400, "VALIDATION_ERROR"), http(403, "FORBIDDEN"), http(429, "RATE_LIMITED"), http(500, undefined), new ApiError({ kind: "network" }), new Error("x")]) {
    assert.equal(classifySpaActionError(error, 1).kind, "error");
  }
});

test("toast: xác nhận nêu nhân viên theo thứ tự đã chọn, từ chối nêu mã lịch, không hứa đã thông báo", () => {
  const suggestions = { staffRequired: 2, suggested: [tam], alternatives: [hanh] };
  assert.equal(getSpaAssignedMessage(ID, ["b", "a"], suggestions), "Đã xác nhận LH-5F1C2A9B, phân công Nguyễn Thị Hạnh và Lê Minh Tâm");
  assert.equal(getSpaAssignedMessage(ID, ["khong-co"], suggestions), "Đã xác nhận LH-5F1C2A9B");
  assert.equal(getSpaRejectedMessage(ID), "Đã từ chối lịch hẹn LH-5F1C2A9B");
});
