import assert from "node:assert/strict";
import test from "node:test";
import {
  canCheckOut,
  describeCage,
  describeLateness,
  describePaid,
  formatReturnMoment,
  getCheckOutGate,
  getMinutesLate,
  isConflictError,
  isNotFoundError,
  LATE_FEE_LOCK_REASON,
  selectTodayReturns,
  STAY_UNPAID_LOCK_REASON,
} from "../features/reception-check-out/check-out.ts";
import { createMockCheckOutEntries, MOCK_CHECK_OUT_IDS } from "../features/reception-check-out/mock-data.ts";
import {
  calculateMockLateFee,
  mockCheckOut,
  mockGetCheckOutData,
  mockListInStayAppointments,
  resetMockCheckOutStore,
} from "../features/reception-check-out/mock-api.ts";
import { createMockCages } from "../features/reception-cages/mock-data.ts";

const NOW = new Date("2026-11-08T02:00:00Z"); // 09:00 ngày 08/11/2026 ở cửa hàng
const TODAY = "2026-11-08";
const ids = MOCK_CHECK_OUT_IDS;
const rejection = async (promise) => promise.then(() => null, (error) => error);
const PLANNED = "2026-11-08T18:00:00+07:00";
const minutesAfter = (minutes) => new Date(Date.parse(PLANNED) + minutes * 60_000);

test("getMinutesLate: dương là trễ, âm là sớm, làm tròn đến phút, giờ không hợp lệ thì 0", () => {
  assert.equal(getMinutesLate(PLANNED, minutesAfter(75).getTime()), 75);
  assert.equal(getMinutesLate(PLANNED, minutesAfter(-30).getTime()), -30);
  assert.equal(getMinutesLate(PLANNED, minutesAfter(0).getTime()), 0);
  assert.equal(getMinutesLate(PLANNED, minutesAfter(0).getTime() + 20_000), 0);
  assert.equal(getMinutesLate("", Date.now()), 0);
});

test("describeLateness: trễ là cảnh báo không nêu số tiền; đúng giờ hoặc sớm là không tính phí", () => {
  const late = describeLateness(75);
  assert.deepEqual([late.tone, late.icon], ["warn", "timer"]);
  assert.equal(late.title, "Trễ 75 phút so với giờ trả dự kiến");
  assert.doesNotMatch(late.body, /\d/);
  const early = describeLateness(-30);
  assert.deepEqual([early.tone, early.icon], ["success", "check-circle"]);
  assert.equal(early.title, "Không tính phí trả muộn");
  assert.equal(early.body, "Đón sớm 30 phút so với giờ trả dự kiến. Trả sớm không hoàn tiền.");
  assert.equal(describeLateness(0).body, "Đón đúng giờ trả dự kiến.");
  assert.equal(describeLateness(-0).body, "Đón đúng giờ trả dự kiến.");
});

test("getCheckOutGate: khóa khi tiền lưu trú hoặc phí trả muộn chưa thanh toán", () => {
  const stay = { kind: "Stay", status: "Paid" };
  const unpaidStay = { kind: "Stay", status: "Unpaid" };
  assert.deepEqual(getCheckOutGate([stay]), { ready: true });
  assert.deepEqual(getCheckOutGate([stay, { kind: "LateFee", status: "Paid" }]), { ready: true });
  assert.deepEqual(getCheckOutGate([stay, { kind: "LateFee", status: "Unpaid" }]), { ready: false, reason: LATE_FEE_LOCK_REASON });
  assert.deepEqual(getCheckOutGate([unpaidStay]), { ready: false, reason: STAY_UNPAID_LOCK_REASON });
  assert.deepEqual(getCheckOutGate([unpaidStay, { kind: "LateFee", status: "Unpaid" }]), { ready: false, reason: STAY_UNPAID_LOCK_REASON });
  assert.equal(STAY_UNPAID_LOCK_REASON, "Cần thu tiền lưu trú trước khi hoàn tất.");
  assert.equal(LATE_FEE_LOCK_REASON, "Cần thu phí trả muộn trước khi hoàn tất.");
});

test("describeCage, formatReturnMoment, describePaid", () => {
  assert.equal(describeCage({ code: "B1", species: "Cat", sizeGroup: "Medium" }), "B1, mèo nhóm Vừa");
  assert.equal(describeCage({ code: "D2", species: "GuineaPig", sizeGroup: "Large" }), "D2, chuột lang nhóm Lớn");
  assert.equal(formatReturnMoment(PLANNED), "18:00, 08/11");
  assert.equal(describePaid({ paidAt: "2026-11-06T10:05:00+07:00", method: "Cash" }), "06/11, tiền mặt");
  assert.equal(describePaid({ paidAt: null, method: null }), null);
});

test("canCheckOut: chỉ lịch lưu trú Đang lưu trú", () => {
  assert.equal(canCheckOut({ type: "Hotel", status: "InStay" }), true);
  assert.equal(canCheckOut({ type: "Hotel", status: "Confirmed" }), false);
  assert.equal(canCheckOut({ type: "Hotel", status: "Completed" }), false);
  assert.equal(canCheckOut({ type: "Spa", status: "InStay" }), false);
});

test("calculateMockLateFee: miễn phí 30 phút đầu, sau đó mỗi 60 phút một lần 50.000đ", () => {
  const fee = (minutes) => calculateMockLateFee(PLANNED, minutesAfter(minutes));
  assert.deepEqual([-60, 0, 30].map(fee), [0, 0, 0]);
  assert.deepEqual([31, 75, 90].map(fee), [50000, 50000, 50000]);
  assert.deepEqual([91, 100, 150].map(fee), [100000, 100000, 100000]);
  assert.equal(fee(151), 150000);
  assert.equal(calculateMockLateFee("", NOW), 0);
});

test("dữ liệu mô phỏng: 3 lịch Đang lưu trú đã thu tiền lưu trú, khớp chuồng và thú cưng của màn Chuồng", () => {
  const entries = createMockCheckOutEntries(NOW);
  assert.deepEqual(entries.map((entry) => entry.pet.name), ["Tuyết", "Mun", "Nấm"]);
  for (const entry of entries) {
    assert.equal(canCheckOut(entry.appointment), true);
    assert.equal(entry.payments[0].kind, "Stay");
    assert.equal(entry.payments[0].status, "Paid");
  }
  const cages = createMockCages(NOW);
  for (const entry of entries) {
    const cage = cages.find((item) => item.cageId === entry.appointment.cageId);
    assert.equal(cage.code, entry.cage.code);
    assert.equal(cage.species, entry.cage.species);
    assert.equal(cage.sizeGroup, entry.cage.sizeGroup);
  }
  const tuyet = entries[0];
  assert.equal(tuyet.payments[0].amount, 420000);
  assert.equal(tuyet.appointment.plannedCheckOut, PLANNED);
  assert.equal(tuyet.payments.length, 1);
  assert.equal(getMinutesLate(entries[1].appointment.plannedCheckOut, NOW.getTime()), 75);
  assert.equal(entries[2].payments[1].kind, "LateFee");
  assert.equal(entries[2].payments[1].amount, 100000);
});

test("selectTodayReturns: lịch Đang lưu trú trả trong ngày, xếp theo giờ trả tăng dần", async () => {
  resetMockCheckOutStore(NOW);
  const items = await mockListInStayAppointments();
  assert.deepEqual(selectTodayReturns(items, TODAY).map((item) => item.pet.name), ["Nấm", "Mun", "Tuyết"]);
  assert.deepEqual(selectTodayReturns(items, "2026-11-09"), []);
  assert.deepEqual(selectTodayReturns([], TODAY), []);
});

test("mock trả thú cưng: trả sớm hoàn tất ngay, không có phí; trả lần hai bị 409", async () => {
  resetMockCheckOutStore(NOW);
  assert.deepEqual(await mockCheckOut(ids.tuyet, NOW), { status: "Completed" });
  const data = await mockGetCheckOutData(ids.tuyet);
  assert.equal(data.appointment.status, "Completed");
  assert.equal(data.appointment.actualCheckOut, NOW.toISOString());
  assert.equal(canCheckOut(data.appointment), false);
  const again = await rejection(mockCheckOut(ids.tuyet, NOW));
  assert.ok(isConflictError(again));
  assert.equal(again.code, "INVALID_TRANSITION");
  assert.equal((await mockListInStayAppointments()).some((item) => item.appointment.appointmentId === ids.tuyet), false);
});

test("mock trả thú cưng: trễ 75 phút → lần đầu phát sinh phí 50.000đ và bị từ chối, lần sau vẫn bị từ chối", async () => {
  resetMockCheckOutStore(NOW);
  const first = await rejection(mockCheckOut(ids.mun, NOW));
  assert.equal(first.status, 409);
  assert.equal(first.code, "PAYMENT_NOT_DUE");
  const data = await mockGetCheckOutData(ids.mun);
  assert.equal(data.appointment.status, "InStay");
  assert.deepEqual(data.payments.map((payment) => [payment.kind, payment.amount, payment.status]), [["Stay", 390000, "Paid"], ["LateFee", 50000, "Unpaid"]]);
  assert.deepEqual(getCheckOutGate(data.payments), { ready: false, reason: LATE_FEE_LOCK_REASON });
  assert.equal((await rejection(mockCheckOut(ids.mun, NOW))).code, "PAYMENT_NOT_DUE");
  assert.equal((await mockGetCheckOutData(ids.mun)).payments.length, 2);
});

test("mock trả thú cưng: phí trả muộn đã thanh toán thì hoàn tất và trả về số phí", async () => {
  resetMockCheckOutStore(NOW);
  const data = await mockGetCheckOutData(ids.nam);
  assert.deepEqual(getCheckOutGate(data.payments), { ready: true });
  assert.deepEqual(await mockCheckOut(ids.nam, NOW), { status: "Completed", lateFee: 100000 });
  assert.equal((await mockGetCheckOutData(ids.nam)).appointment.status, "Completed");
});

test("mock lỗi: lịch không tồn tại 404; dữ liệu trả về là bản sao", async () => {
  resetMockCheckOutStore(NOW);
  assert.ok(isNotFoundError(await rejection(mockGetCheckOutData("khong-co"))));
  assert.ok(isNotFoundError(await rejection(mockCheckOut("khong-co", NOW))));
  const copy = await mockGetCheckOutData(ids.tuyet);
  copy.appointment.status = "Completed";
  assert.equal((await mockGetCheckOutData(ids.tuyet)).appointment.status, "InStay");
});
