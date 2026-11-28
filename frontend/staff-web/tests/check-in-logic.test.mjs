import assert from "node:assert/strict";
import test from "node:test";
import {
  COST_PENDING_LOCK_REASON,
  describeStayFormula,
  describeStayPaid,
  describeWeightOutcome,
  getCheckInPanel,
  getHotelCheckInGate,
  getRemainingSeconds,
  isConflictError,
  isCostConfirmationPendingError,
  isNotFoundError,
  isPaymentNotDueError,
  NOT_CHECK_IN_STEP_MESSAGE,
  resolvePendingCostConfirmation,
  STAY_UNPAID_LOCK_REASON,
  WEIGHT_STEP_LOCK_REASON,
} from "../features/reception-check-in/check-in.ts";
import { createMockCheckInEntries, MOCK_CHECK_IN_IDS } from "../features/reception-check-in/mock-data.ts";
import {
  MOCK_WEIGHT_INVALID_TRANSITION,
  MOCK_WEIGHT_NETWORK_ERROR,
  mockCheckInHotel,
  mockCheckInSpa,
  mockCheckWeight,
  mockGetCheckInData,
  mockRespondCostConfirmation,
  resetMockCheckInStore,
} from "../features/reception-check-in/mock-api.ts";
import {
  formatKg,
  formatWeightDifference,
  formatWeightInput,
  parseWeightInput,
  toActualWeightRequest,
  validateActualWeight,
  WEIGHT_REQUIRED_MESSAGE,
} from "../features/reception-check-in/weight.ts";

const NOW = new Date("2026-11-08T02:00:00Z"); // 09:00 ngày 08/11/2026 ở cửa hàng
const ids = MOCK_CHECK_IN_IDS;
const rejection = async (promise) => promise.then(() => null, (error) => error);

test("parseWeightInput: nhận dấu phẩy hoặc chấm, loại chuỗi không phải số thập phân", () => {
  assert.equal(parseWeightInput("11,2"), 11.2);
  assert.equal(parseWeightInput(" 9.8 "), 9.8);
  assert.equal(parseWeightInput("9"), 9);
  for (const bad of ["", " ", "abc", "1,2,3", "-1", "1e3", ",5", "5,", "1.234,5", "0x10"]) {
    assert.equal(parseWeightInput(bad), null, bad);
  }
});

test("validateActualWeight và toActualWeightRequest: phải lớn hơn 0, chỉ gửi actualWeightKg", () => {
  assert.equal(validateActualWeight("0"), WEIGHT_REQUIRED_MESSAGE);
  assert.equal(validateActualWeight("0,0"), WEIGHT_REQUIRED_MESSAGE);
  assert.equal(validateActualWeight(""), WEIGHT_REQUIRED_MESSAGE);
  assert.equal(validateActualWeight("0,01"), true);
  assert.deepEqual(toActualWeightRequest({ actualWeight: "11,2" }), { actualWeightKg: 11.2 });
  assert.equal(toActualWeightRequest({ actualWeight: "x" }), null);
  assert.equal(WEIGHT_REQUIRED_MESSAGE, "Vui lòng nhập cân nặng thực tế lớn hơn 0.");
});

test("định dạng cân nặng: tối đa 2 chữ số thập phân, chênh lệch không dính sai số số thực", () => {
  assert.equal(formatKg(11.2), "11,2 kg");
  assert.equal(formatKg(1.45), "1,45 kg");
  assert.equal(formatKg(9), "9,0 kg");
  assert.equal(formatWeightDifference(11.2, 9), "2,2 kg");
  assert.equal(formatWeightDifference(1.45, 1.4), "0,05 kg");
  assert.equal(formatWeightDifference(2.9, 3.2), "0,3 kg");
  assert.equal(formatWeightInput(11.2), "11,2");
  assert.equal(formatWeightInput(9), "9");
});

test("getRemainingSeconds: không âm, làm tròn lên", () => {
  const expiresAt = "2026-11-08T02:30:00Z";
  assert.equal(getRemainingSeconds(expiresAt, NOW.getTime()), 1800);
  assert.equal(getRemainingSeconds(expiresAt, NOW.getTime() + 1500), 1799);
  assert.equal(getRemainingSeconds(expiresAt, Date.parse(expiresAt) + 5000), 0);
});

test("getCheckInPanel: theo loại lịch, trạng thái và yêu cầu xác nhận đang chờ", () => {
  const byId = Object.fromEntries(createMockCheckInEntries(NOW).map((entry) => [entry.data.appointment.appointmentId, entry.data.appointment]));
  assert.equal(getCheckInPanel(byId[ids.spaBong]).kind, "form");
  assert.equal(getCheckInPanel(byId[ids.hotelCom]).kind, "form");
  const pending = getCheckInPanel(byId[ids.spaMuop]);
  assert.equal(pending.kind, "pending");
  assert.equal(pending.confirmation.newSizeGroup, "Medium");
  assert.deepEqual(getCheckInPanel({ ...byId[ids.spaBong], status: "Received", actualWeightKg: 9.8 }), { kind: "recorded", actualWeightKg: 9.8 });
  assert.deepEqual(getCheckInPanel({ ...byId[ids.hotelCom], actualWeightKg: 1.45 }), { kind: "recorded", actualWeightKg: 1.45 });
  assert.equal(getCheckInPanel({ ...byId[ids.spaBong], status: "InProgress" }).kind, "unavailable");
  assert.equal(getCheckInPanel({ ...byId[ids.spaBong], status: "Cancelled" }).kind, "unavailable");
  assert.equal(getCheckInPanel({ ...byId[ids.hotelCom], status: "InStay" }).kind, "unavailable");
});

test("describeWeightOutcome: OK và PRICE_DECREASED; NEEDS_CONFIRMATION không có thông báo ở đây", () => {
  const base = { actualWeightKg: 9.8, declaredWeightKg: 9, previousSizeGroup: "Small" };
  const ok = describeWeightOutcome({ ...base, weightCheck: { result: "OK" } }, true);
  assert.equal(ok.tone, "success");
  assert.equal(ok.title, "Trong ngưỡng dung sai, chi phí không đổi");
  assert.equal(ok.body, "Chênh 0,8 kg, vẫn thuộc nhóm Nhỏ. Hồ sơ cập nhật cân nặng 9,8 kg.");

  const decreased = { weightCheck: { result: "PRICE_DECREASED", newSizeGroup: "Small", oldAmount: 170000, newAmount: 140000 }, actualWeightKg: 2.9, declaredWeightKg: 3.2, previousSizeGroup: "Medium" };
  const spa = describeWeightOutcome(decreased, true);
  assert.equal(spa.title, "Cân nặng giảm, xuống nhóm Nhỏ");
  assert.equal(spa.body, "Hồ sơ cập nhật 2,9 kg. Chi phí giảm từ 170.000đ xuống 140.000đ. Khung giờ giữ nguyên.");
  assert.doesNotMatch(describeWeightOutcome(decreased, false).body, /Khung giờ/);

  assert.equal(describeWeightOutcome({ ...base, weightCheck: { result: "NEEDS_CONFIRMATION", newSizeGroup: "Medium", oldAmount: 1, newAmount: 2, expiresAt: "x" } }, true), null);
});

test("mock tiếp nhận spa: Bông 11,2 kg → cần khách xác nhận, lịch giữ Đã tiếp nhận kèm yêu cầu đang chờ", async () => {
  resetMockCheckInStore(new Date());
  const result = await mockCheckInSpa(ids.spaBong, { actualWeightKg: 11.2 });
  assert.equal(result.status, "Received");
  assert.equal(result.weightCheck.result, "NEEDS_CONFIRMATION");
  assert.equal(result.weightCheck.newSizeGroup, "Medium");
  assert.equal(result.weightCheck.oldAmount, 270000);
  assert.equal(result.weightCheck.newAmount, 330000);
  const data = await mockGetCheckInData(ids.spaBong);
  assert.equal(data.appointment.status, "Received");
  assert.equal(data.appointment.sizeGroup, "Small");
  assert.equal(data.pet.weightKg, 9);
  assert.equal(getCheckInPanel(data.appointment).kind, "pending");
  assert.ok(Date.parse(data.appointment.pendingCostConfirmation.expiresAt) > Date.now());
});

test("mock phản hồi chi phí: đồng ý cập nhật hồ sơ, từ chối hủy lịch, không có yêu cầu thì 404", async () => {
  resetMockCheckInStore(new Date());
  await mockCheckInSpa(ids.spaBong, { actualWeightKg: 11.2 });
  assert.deepEqual(await mockRespondCostConfirmation(ids.spaBong, { accept: true }), { status: "Received" });
  const accepted = await mockGetCheckInData(ids.spaBong);
  assert.equal(accepted.pet.weightKg, 11.2);
  assert.equal(accepted.pet.sizeGroup, "Medium");
  assert.equal(accepted.appointment.sizeGroup, "Medium");
  assert.equal(getCheckInPanel(accepted.appointment).kind, "recorded");
  assert.ok(isNotFoundError(await rejection(mockRespondCostConfirmation(ids.spaBong, { accept: true }))));

  assert.deepEqual(await mockRespondCostConfirmation(ids.spaMuop, { accept: false }), { status: "Cancelled" });
  const rejected = await mockGetCheckInData(ids.spaMuop);
  assert.equal(rejected.appointment.cancelReason, "CostNotConfirmed");
  assert.equal(getCheckInPanel(rejected.appointment).kind, "unavailable");
});

test("mock quá hạn xác nhận: lịch tự hủy, phản hồi trả 409 COST_CONFIRMATION_EXPIRED", async () => {
  resetMockCheckInStore(new Date(Date.now() - 40 * 60_000)); // hạn xác nhận của Mướp đã qua 13 phút
  const error = await rejection(mockRespondCostConfirmation(ids.spaMuop, { accept: true }));
  assert.equal(error.code, "COST_CONFIRMATION_EXPIRED");
  assert.ok(isConflictError(error));
  const data = await mockGetCheckInData(ids.spaMuop);
  assert.equal(data.appointment.status, "Cancelled");
  assert.equal(data.appointment.pendingCostConfirmation, null);
});

test("mock tiếp nhận spa: trong dung sai → OK; xuống nhóm → PRICE_DECREASED, hồ sơ và nhóm cập nhật", async () => {
  resetMockCheckInStore(new Date());
  const ok = await mockCheckInSpa(ids.spaMit, { actualWeightKg: 4.5 });
  assert.equal(ok.weightCheck.result, "OK");
  assert.equal((await mockGetCheckInData(ids.spaMit)).pet.weightKg, 4.5);

  const decreased = await mockCheckInSpa(ids.spaSushi, { actualWeightKg: 2.9 });
  assert.deepEqual(decreased.weightCheck, { result: "PRICE_DECREASED", newSizeGroup: "Small", oldAmount: 170000, newAmount: 140000 });
  const sushi = await mockGetCheckInData(ids.spaSushi);
  assert.equal(sushi.appointment.sizeGroup, "Small");
  assert.equal(sushi.pet.sizeGroup, "Small");
});

test("mock: chênh bằng ngưỡng dung sai vẫn là OK", async () => {
  resetMockCheckInStore(new Date());
  // Bông khai báo 9,0 kg, dung sai mô phỏng 1,5 kg, nhóm Nhỏ tới 10 kg: 10,5 kg chênh đúng 1,5 và sang nhóm Vừa.
  const result = await mockCheckInSpa(ids.spaBong, { actualWeightKg: 10.5 });
  assert.equal(result.weightCheck.result, "OK");
});

test("mock đối chiếu lưu trú: ghi cân nặng không đổi trạng thái; lịch spa hoặc đã đối chiếu bị từ chối", async () => {
  resetMockCheckInStore(new Date());
  const response = await mockCheckWeight(ids.hotelCom, { actualWeightKg: 1.45 });
  assert.equal(response.weightCheck.result, "OK");
  const data = await mockGetCheckInData(ids.hotelCom);
  assert.equal(data.appointment.status, "Confirmed");
  assert.equal(data.appointment.actualWeightKg, 1.45);
  assert.deepEqual(getCheckInPanel(data.appointment), { kind: "recorded", actualWeightKg: 1.45 });
  assert.equal(data.cageCode, "C1");
  assert.ok(isConflictError(await rejection(mockCheckWeight(ids.spaBong, { actualWeightKg: 9 }))));

  resetMockCheckInStore(new Date());
  const pending = await mockCheckWeight(ids.hotelCom, { actualWeightKg: 2.5 });
  assert.equal(pending.weightCheck.result, "NEEDS_CONFIRMATION");
  const blocked = await rejection(mockCheckWeight(ids.hotelCom, { actualWeightKg: 2.5 }));
  assert.ok(isCostConfirmationPendingError(blocked));
});

test("mock lỗi: lịch đã tiếp nhận 409, cân nặng đặc biệt cho mất mạng và hết giữ chỗ, lịch không tồn tại 404", async () => {
  resetMockCheckInStore(new Date());
  await mockCheckInSpa(ids.spaMit, { actualWeightKg: 4 });
  assert.equal((await rejection(mockCheckInSpa(ids.spaMit, { actualWeightKg: 4 }))).code, "INVALID_TRANSITION");
  assert.equal((await rejection(mockCheckInSpa(ids.spaSushi, { actualWeightKg: MOCK_WEIGHT_NETWORK_ERROR }))).kind, "network");
  assert.equal((await rejection(mockCheckInSpa(ids.spaSushi, { actualWeightKg: MOCK_WEIGHT_INVALID_TRANSITION }))).code, "INVALID_TRANSITION");
  assert.ok(isNotFoundError(await rejection(mockGetCheckInData("khong-co"))));
});


test("mock lịch lưu trú: tiền lưu trú = số đêm × (giá + thức ăn) và khớp bảng giá của nhóm kích cỡ", () => {
  const hotels = createMockCheckInEntries(NOW).filter((entry) => entry.data.appointment.type === "Hotel");
  assert.deepEqual(hotels.map((entry) => entry.data.pet.name), ["Cốm", "Gấu"]);
  for (const entry of hotels) {
    const { appointment, stay } = entry.data;
    assert.equal(appointment.plannedCheckIn !== undefined && appointment.plannedCheckOut !== undefined, true);
    for (const [group, rate] of Object.entries(entry.rule.hotelRates)) {
      assert.equal(2 * (rate.pricePerNight + rate.foodPerNight), entry.rule.prices[group], `${entry.data.pet.name} ${group}`);
    }
    assert.equal(stay.payment.kind, "Stay");
    assert.equal(stay.payment.amount, entry.rule.prices[appointment.sizeGroup]);
  }
  const [com, gau] = hotels.map((entry) => entry.data);
  assert.deepEqual([com.stay.payment.status, com.stay.payment.amount, com.stay.payment.paidAt], ["Unpaid", 250000, null]);
  assert.deepEqual([gau.stay.payment.status, gau.stay.payment.amount, gau.stay.payment.method], ["Paid", 240000, "Cash"]);
  assert.equal(gau.cageCode, "A1");
  assert.equal(createMockCheckInEntries(NOW).filter((entry) => entry.data.appointment.type === "Spa").every((entry) => entry.data.stay === null), true);
});

test("describeStayFormula và describeStayPaid: công thức theo số đêm, ngày và phương thức đã thu", () => {
  const entries = createMockCheckInEntries(NOW);
  const com = entries.find((entry) => entry.data.appointment.appointmentId === ids.hotelCom).data;
  const gau = entries.find((entry) => entry.data.appointment.appointmentId === ids.hotelGau).data;
  assert.equal(describeStayFormula(com.appointment, com.stay), "2 đêm × (100.000đ + 25.000đ)");
  assert.equal(describeStayFormula({ ...com.appointment, plannedCheckOut: undefined }, com.stay), null);
  assert.equal(describeStayPaid(gau.stay.payment), "08/11, tiền mặt");
  assert.equal(describeStayPaid({ ...gau.stay.payment, paidAt: null, method: null }), null);
});

test("getHotelCheckInGate: lý do khóa theo thứ tự cân nặng → chờ khách xác nhận → tiền lưu trú", async () => {
  resetMockCheckInStore(new Date());
  assert.deepEqual(getHotelCheckInGate(await mockGetCheckInData(ids.hotelCom)), { ready: false, reason: WEIGHT_STEP_LOCK_REASON });
  await mockCheckWeight(ids.hotelCom, { actualWeightKg: 1.45 });
  assert.deepEqual(getHotelCheckInGate(await mockGetCheckInData(ids.hotelCom)), { ready: false, reason: STAY_UNPAID_LOCK_REASON });
  assert.deepEqual(getHotelCheckInGate(await mockGetCheckInData(ids.hotelGau)), { ready: true });

  resetMockCheckInStore(new Date());
  await mockCheckWeight(ids.hotelCom, { actualWeightKg: 2.5 });
  assert.deepEqual(getHotelCheckInGate(await mockGetCheckInData(ids.hotelCom)), { ready: false, reason: COST_PENDING_LOCK_REASON });

  const gau = await mockGetCheckInData(ids.hotelGau);
  const inStay = { ...gau, appointment: { ...gau.appointment, status: "InStay" } };
  assert.deepEqual(getHotelCheckInGate(inStay), { ready: false, reason: NOT_CHECK_IN_STEP_MESSAGE });
});

test("mock tiếp nhận lưu trú: Gấu vào chuồng → Đang lưu trú; thiếu điều kiện thì 409 đúng mã", async () => {
  resetMockCheckInStore(new Date());
  const unweighed = await rejection(mockCheckInHotel(ids.hotelCom));
  assert.equal(unweighed.status, 409);
  assert.equal(unweighed.code, "INVALID_TRANSITION");

  await mockCheckWeight(ids.hotelCom, { actualWeightKg: 1.45 });
  const unpaid = await rejection(mockCheckInHotel(ids.hotelCom));
  assert.ok(isPaymentNotDueError(unpaid));
  assert.equal(isPaymentNotDueError(unweighed), false);
  assert.equal(isPaymentNotDueError(new Error("x")), false);

  assert.equal((await rejection(mockCheckInHotel(ids.spaBong))).code, "INVALID_TRANSITION");

  assert.deepEqual(await mockCheckInHotel(ids.hotelGau), { status: "InStay" });
  const data = await mockGetCheckInData(ids.hotelGau);
  assert.equal(data.appointment.status, "InStay");
  assert.equal(getCheckInPanel(data.appointment).kind, "unavailable");
  assert.ok(isConflictError(await rejection(mockCheckInHotel(ids.hotelGau))));
  assert.ok(isNotFoundError(await rejection(mockCheckInHotel("khong-co"))));
});

test("mock tiếp nhận lưu trú: chờ khách xác nhận chi phí thì COST_CONFIRMATION_PENDING", async () => {
  resetMockCheckInStore(new Date());
  await mockCheckWeight(ids.hotelCom, { actualWeightKg: 2.5 });
  assert.ok(isCostConfirmationPendingError(await rejection(mockCheckInHotel(ids.hotelCom))));
});

test("mock tiền lưu trú theo nhóm kích cỡ: khách đồng ý chi phí mới thì tiền và đơn giá đổi theo nhóm Vừa", async () => {
  resetMockCheckInStore(new Date());
  await mockCheckWeight(ids.hotelCom, { actualWeightKg: 2.5 });
  const pending = await mockGetCheckInData(ids.hotelCom);
  assert.equal(pending.stay.payment.amount, 250000);
  await mockRespondCostConfirmation(ids.hotelCom, { accept: true });
  const data = await mockGetCheckInData(ids.hotelCom);
  assert.equal(data.appointment.sizeGroup, "Medium");
  assert.equal(data.stay.payment.amount, 330000);
  assert.deepEqual(data.stay.rate, { pricePerNight: 120000, foodPerNight: 45000 });
  assert.equal(describeStayFormula(data.appointment, data.stay), "2 đêm × (120.000đ + 45.000đ)");
});

test("mock tiền lưu trú: cân nặng giảm xuống nhóm nhỏ hơn thì tiền lưu trú giảm ngay", async () => {
  resetMockCheckInStore(new Date());
  await mockCheckWeight(ids.hotelCom, { actualWeightKg: 2.5 });
  await mockRespondCostConfirmation(ids.hotelCom, { accept: true });
  const response = await mockCheckWeight(ids.hotelCom, { actualWeightKg: 1 });
  assert.equal(response.weightCheck.result, "PRICE_DECREASED");
  const data = await mockGetCheckInData(ids.hotelCom);
  assert.equal(data.appointment.sizeGroup, "Small");
  assert.equal(data.stay.payment.amount, 250000);
  assert.deepEqual(data.stay.rate, { pricePerNight: 100000, foodPerNight: 25000 });
});

test("resolvePendingCostConfirmation: ưu tiên backend, ghép yêu cầu đã nhớ khi lịch còn chờ khách, bỏ khi khách đã đồng ý, lịch đã hủy hoặc sai trạng thái", () => {
  const remembered = {
    actualWeightKg: 11.2,
    newSizeGroup: "Medium",
    oldAmount: 150000,
    newAmount: 200000,
    status: "Pending",
    expiresAt: "2026-11-08T02:30:00Z",
  };
  const spa = { appointmentId: ids.spaBong, type: "Spa", status: "Received", sizeGroup: "Small" };

  assert.equal(resolvePendingCostConfirmation(spa, remembered).pendingCostConfirmation, remembered);
  assert.equal(resolvePendingCostConfirmation(spa, null), spa);

  const fromServer = { ...spa, pendingCostConfirmation: { ...remembered, newAmount: 1 } };
  assert.equal(resolvePendingCostConfirmation(fromServer, remembered), fromServer);

  for (const settled of [
    { ...spa, sizeGroup: "Medium" },
    { ...spa, status: "Cancelled" },
    { ...spa, status: "Confirmed" },
    { ...spa, status: "InProgress" },
  ]) {
    assert.equal(resolvePendingCostConfirmation(settled, remembered), settled);
  }

  const hotel = { appointmentId: ids.hotelCom, type: "Hotel", status: "Confirmed", sizeGroup: "Small" };
  assert.equal(resolvePendingCostConfirmation(hotel, remembered).pendingCostConfirmation, remembered);
  const inStay = { ...hotel, status: "InStay" };
  assert.equal(resolvePendingCostConfirmation(inStay, remembered), inStay);

  assert.equal(getCheckInPanel(resolvePendingCostConfirmation(spa, remembered)).kind, "pending");
});

