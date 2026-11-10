import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAppointmentCode,
  formatDate,
  formatDayAndTime,
  formatMoney,
  formatPhone,
  formatRelativeDay,
  formatShortDate,
  formatTime,
  formatTimeRange,
  formatWeekdayShort,
  formatWeight,
} from "../lib/format.ts";
import { getPreviousDateKey, getStoreDateKey } from "../lib/time.ts";

test("ngày, giờ, khoảng giờ theo múi giờ cửa hàng", () => {
  assert.equal(formatDate("2026-10-06T09:00:00+07:00"), "06/10/2026");
  assert.equal(formatShortDate("2026-10-06T09:00:00+07:00"), "06/10");
  assert.equal(formatTime("2026-10-06T09:00:00+07:00"), "09:00");
  assert.equal(formatTimeRange("2026-10-06T09:00:00+07:00", "2026-10-06T11:00:00+07:00"), "09:00 – 11:00");
  // 23:30 UTC ngày 05/10 là 06:30 ngày 06/10 ở cửa hàng.
  assert.equal(formatDate("2026-10-05T23:30:00Z"), "06/10/2026");
  assert.equal(getStoreDateKey("2026-10-05T23:30:00Z"), "2026-10-06");
  assert.equal(getPreviousDateKey("2026-10-01"), "2026-09-30");
});

test("thời gian thông báo: hôm nay chỉ có giờ, hôm qua có nhãn, còn lại ngày/tháng kèm giờ", () => {
  const today = "2026-10-06";
  assert.equal(formatRelativeDay("2026-10-06T08:12:00+07:00", today), "08:12");
  assert.equal(formatRelativeDay("2026-10-05T16:15:00+07:00", today), "Hôm qua, 16:15");
  assert.equal(formatRelativeDay("2026-10-04T17:05:00+07:00", today), "04/10, 17:05");
});

test("mã lịch hẹn hiển thị: LH- + 8 ký tự đầu của uuid viết hoa", () => {
  assert.equal(formatAppointmentCode("5f1c2a9b-0000-4000-8000-000000000001"), "LH-5F1C2A9B");
});

test("tiền, cân nặng, thứ viết tắt và mốc ngày giờ gọn", () => {
  assert.equal(formatMoney(540000), "540.000đ");
  assert.equal(formatWeight(11), "11,0 kg");
  assert.equal(formatWeekdayShort("2026-10-08T09:00:00+07:00"), "T5");
  assert.equal(formatWeekdayShort("2026-10-11T09:00:00+07:00"), "CN");
  assert.equal(formatDayAndTime("2026-10-08T09:00:00+07:00"), "T5 08/10, 09:00");
});

test("số điện thoại hiển thị có dấu cách; chuỗi không phải 10 chữ số giữ nguyên", () => {
  assert.equal(formatPhone("0903412678"), "0903 412 678");
  assert.equal(formatPhone("090341267"), "090341267");
  assert.equal(formatPhone("0903 412 678"), "0903 412 678");
});

