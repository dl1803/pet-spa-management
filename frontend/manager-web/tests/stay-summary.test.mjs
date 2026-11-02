import assert from "node:assert/strict";
import test from "node:test";
import { formatStayMoment, getStaySummary } from "../features/pending/stay-summary.ts";

const checkIn = "2026-10-08T09:00:00+07:00";
const checkOut = "2026-10-10T17:00:00+07:00";

test("tóm tắt lưu trú theo UI demo: 2 đêm, ngày từng đêm, tạm tính và công thức", () => {
  const summary = getStaySummary(checkIn, checkOut, 170000, 40000);
  assert.equal(summary.nights, 2);
  assert.deepEqual(summary.nightDates, ["08/10", "09/10"]);
  assert.equal(summary.total, 420000);
  assert.equal(summary.formula, "2 × (170.000đ + 40.000đ)");
});

test("ngày trả không sau ngày nhận thì 0 đêm, không lỗi", () => {
  const summary = getStaySummary(checkOut, checkIn, 170000, 40000);
  assert.equal(summary.nights, 0);
  assert.deepEqual(summary.nightDates, []);
  assert.equal(summary.total, 0);
});

test("mốc nhận, trả theo UI demo", () => {
  assert.equal(formatStayMoment(checkIn), "09:00, thứ năm 08/10");
  assert.equal(formatStayMoment(checkOut), "17:00, thứ bảy 10/10");
});
