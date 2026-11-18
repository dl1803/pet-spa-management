import assert from "node:assert/strict";
import test from "node:test";
import { describeDeactivation } from "../features/staff/deactivation.ts";

test("có lịch về Chờ xác nhận: nêu số lịch và chuyển tới màn Chờ xác nhận", () => {
  assert.deepEqual(describeDeactivation("Lê Minh Tâm", 2), {
    message: "Đã vô hiệu hóa Lê Minh Tâm. 2 lịch đã về Chờ xác nhận.",
    openPending: true,
  });
  assert.equal(describeDeactivation("Lê Minh Tâm", 1).openPending, true);
});

test("không có lịch về Chờ xác nhận (lễ tân hoặc nhân viên spa chưa có lịch): không nêu số lịch, ở lại màn Nhân viên", () => {
  assert.deepEqual(describeDeactivation("Phạm Thu Hà", 0), { message: "Đã vô hiệu hóa Phạm Thu Hà.", openPending: false });
});
