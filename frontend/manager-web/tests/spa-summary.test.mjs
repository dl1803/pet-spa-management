import assert from "node:assert/strict";
import test from "node:test";
import {
  formatEventMoment,
  formatHoldUntil,
  formatSlotMoment,
  formatSlotRange,
  getSpaConfirmMessage,
} from "../features/pending/spa-summary.ts";
import { MOCK_STAFF_ASSIGNMENTS } from "../features/pending/mock-data.ts";

const [mochi, dau, lu] = MOCK_STAFF_ASSIGNMENTS;

test("khung giờ và giờ giữ chỗ theo giờ cửa hàng", () => {
  assert.equal(formatSlotRange("2026-10-07T13:00:00+07:00", "2026-10-07T14:30:00+07:00"), "13:00 – 14:30, 07/10");
  assert.equal(formatHoldUntil("2026-10-07T14:30:00+07:00", 15), "Giữ chỗ đến 14:45 gồm dọn dẹp");
  assert.equal(formatHoldUntil("2026-10-06T16:00:00+07:00", 20), "Giữ chỗ đến 16:20 gồm dọn dẹp");
});

test("mốc hẹn và thời điểm sự kiện", () => {
  assert.equal(formatSlotMoment("2026-10-06T15:00:00+07:00"), "06/10 15:00");
  assert.equal(formatEventMoment("2026-10-05T20:30:00+07:00"), "20:30 ngày 05/10");
});

test("toast xác nhận lịch mới nêu nhân viên theo thứ tự đã chọn", () => {
  const [tam, hanh] = [mochi.suggestions.suggested[0], mochi.suggestions.alternatives[0]];
  assert.equal(getSpaConfirmMessage(mochi, [tam.staffId]), "Đã xác nhận LH-5F1C2A9B, phân công Lê Minh Tâm");
  assert.equal(
    getSpaConfirmMessage(lu, [hanh.staffId, tam.staffId]),
    "Đã xác nhận LH-5F1C2A9B, phân công Nguyễn Thị Hạnh và Lê Minh Tâm",
  );
});

test("toast xác nhận lịch khách đã đổi nêu số tiền của lịch, không tính lại", () => {
  assert.equal(getSpaConfirmMessage(dau, [dau.suggestions.suggested[0].staffId]), "Đã xác nhận LH-5F1C2A9B với số tiền 180.000đ");
  const other = { ...dau, amount: 777000 };
  assert.ok(getSpaConfirmMessage(other, []).endsWith("với số tiền 777.000đ"));
});

test("staffId lạ bị bỏ qua, không có ai thì chỉ nêu mã lịch", () => {
  assert.equal(getSpaConfirmMessage(mochi, ["khong-co"]), "Đã xác nhận LH-5F1C2A9B");
});
