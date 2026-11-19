import assert from "node:assert/strict";
import test from "node:test";
import { classifyHotelActionError } from "../features/pending/hotel-action-error.ts";
import { getStayAssignedMessage, getStayRejectedMessage } from "../features/pending/stay-summary.ts";
import { ApiError } from "../lib/api/errors.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03";
const http = (status, code, detail) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });

test("phân loại lỗi: chuồng không còn khả dụng dùng câu cố định, bỏ lựa chọn tay", () => {
  assert.deepEqual(classifyHotelActionError(http(409, "CAGE_CONFLICT", "Chuồng đã được gán cho lịch khác hoặc không phù hợp với thú cưng.")), {
    kind: "message", message: "Chuồng đã được gán trong thời gian này.", resetSelection: true,
  });
});

test("phân loại lỗi: lịch không còn chờ hoặc không tìm thấy là lỗi cũ; còn lại hiện lỗi chung", () => {
  assert.equal(classifyHotelActionError(http(409, "INVALID_TRANSITION")).kind, "stale");
  assert.equal(classifyHotelActionError(http(404, "NOT_FOUND")).kind, "stale");
  const validation = classifyHotelActionError(http(400, "VALIDATION_ERROR", "Lịch lưu trú yêu cầu cageId."));
  assert.equal(validation.kind, "error");
  assert.equal(validation.error.status, 400);
  assert.equal(classifyHotelActionError(http(403, "FORBIDDEN")).kind, "error");
  assert.equal(classifyHotelActionError(http(500)).kind, "error");
});

test("lỗi mạng hoặc lỗi lạ được chuẩn hóa thành ApiError", () => {
  const result = classifyHotelActionError(new Error("boom"));
  assert.equal(result.kind, "error");
  assert.ok(result.error instanceof ApiError);
});

test("câu toast: xác nhận nêu chuồng được gán, từ chối nêu mã lịch", () => {
  assert.equal(getStayAssignedMessage(ID, "B3"), "Đã xác nhận LH-5F1C2A9B, gán chuồng B3");
  assert.equal(getStayAssignedMessage(ID, null), "Đã xác nhận LH-5F1C2A9B");
  assert.equal(getStayRejectedMessage(ID), "Đã từ chối lịch hẹn LH-5F1C2A9B");
});
