import assert from "node:assert/strict";
import test from "node:test";
import {
  COUNTER_METHOD_ORDER,
  createCounterFormValues,
  FORM_MESSAGES,
  getCounterFormState,
  isCounterMethod,
  parseMoneyInput,
  toCounterPaymentRequest,
  validateReceivedAmount,
} from "../features/reception-payments/forms.ts";
import { mockListCounterPayments, mockPayAtCounter, resetMockPaymentStore } from "../features/reception-payments/mock-api.ts";
import { createMockPaymentRows } from "../features/reception-payments/mock-data.ts";
import {
  buildBreakdown,
  describePaymentRow,
  getPaymentSubtitle,
  getPaymentTitle,
  getTransferContent,
  resolveSelectedRow,
} from "../features/reception-payments/payment.ts";
import { formatAppointmentCode } from "../lib/format.ts";

// 10:00 ngày 11/11/2026 theo giờ cửa hàng.
const NOW = new Date("2026-11-11T03:00:00Z");
const [cashStay, secondStay, lateFee, spa] = createMockPaymentRows(NOW);

test("dữ liệu mô phỏng: bốn khoản chưa thu, ID hợp lệ, mã lịch không trùng nhau", () => {
  const rows = createMockPaymentRows(NOW);
  assert.deepEqual(
    rows.map((row) => [row.payment.kind, row.payment.amount, row.payment.status]),
    [
      ["Stay", 250000, "Unpaid"],
      ["Stay", 440000, "Unpaid"],
      ["LateFee", 100000, "Unpaid"],
      ["Spa", 270000, "Unpaid"],
    ],
  );
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/;
  for (const row of rows) {
    assert.match(row.payment.paymentId, uuid);
    assert.match(row.appointment.appointmentId, uuid);
    assert.equal(row.payment.appointmentId, row.appointment.appointmentId);
  }
  const codes = new Set(rows.map((row) => formatAppointmentCode(row.appointment.appointmentId)));
  assert.equal(codes.size, rows.length);
  assert.equal(rows[3].services.reduce((sum, service) => sum + service.price, 0), rows[3].payment.amount);
});

test("tiêu đề, dòng phụ và nội dung chuyển khoản", () => {
  assert.equal(getPaymentTitle(cashStay), "Cốm: tiền lưu trú");
  assert.equal(getPaymentTitle(lateFee), "Mướp: phí trả muộn");
  assert.equal(getPaymentTitle(spa), "Gạo: khoản spa");
  assert.equal(getPaymentSubtitle(cashStay), "LH-A2800001. Phạm Quốc Huy");
  assert.equal(getTransferContent(cashStay.appointment.appointmentId), "LHA2800001");
});

test("thiếu tên thú cưng hoặc tên khách thì hiện dấu gạch", () => {
  const row = structuredClone(cashStay);
  row.appointment.petName = undefined;
  row.appointment.customerName = "";
  assert.equal(getPaymentTitle(row), "—: tiền lưu trú");
  assert.equal(getPaymentSubtitle(row), "LH-A2800001. —");
});

test("mô tả phiếu rút gọn theo loại khoản", () => {
  const today = "2026-11-11";
  assert.equal(describePaymentRow(cashStay, today), "Tiền lưu trú, nhận 10:00 hôm nay");
  assert.equal(describePaymentRow(secondStay, today), "Tiền lưu trú, nhận 08:00 ngày 10/11");
  assert.equal(describePaymentRow(lateFee, today), "Phí trả muộn, LH-A2800003");
  assert.equal(describePaymentRow(spa, today), "Lịch spa đã hoàn tất, LH-A2800004");
  const noCheckIn = structuredClone(cashStay);
  noCheckIn.appointment.plannedCheckIn = null;
  assert.equal(describePaymentRow(noCheckIn, today), "Tiền lưu trú, LH-A2800001");
});

test("cách tính tiền lưu trú: lịch, nhóm áp dụng, số đêm × (giá + thức ăn)", () => {
  assert.deepEqual(buildBreakdown(cashStay), [
    { label: "Lịch hẹn", value: "Đã xác nhận, chờ tiếp nhận" },
    { label: "Nhóm áp dụng", value: "Thỏ, nhóm Nhỏ (đã đối chiếu 1,45 kg)" },
    { label: "Cách tính", value: "2 đêm × (100.000đ + 25.000đ)" },
  ]);
  assert.equal(buildBreakdown(secondStay)[2].value, "2 đêm × (150.000đ + 70.000đ)");
});

test("cách tính tiền lưu trú: thiếu bảng giá hoặc cân nặng thì bỏ dòng, không suy ra số liệu", () => {
  const row = structuredClone(cashStay);
  row.hotelRate = null;
  row.appointment.actualWeightKg = null;
  assert.deepEqual(buildBreakdown(row), [
    { label: "Lịch hẹn", value: "Đã xác nhận, chờ tiếp nhận" },
    { label: "Nhóm áp dụng", value: "Thỏ, nhóm Nhỏ" },
  ]);
});

test("cách tính khoản spa: thời điểm hoàn tất, nhóm áp dụng và giá từng dịch vụ", () => {
  assert.deepEqual(buildBreakdown(spa), [
    { label: "Hoàn tất lúc", value: "T4 11/11, 09:30" },
    { label: "Nhóm áp dụng", value: "Chó, nhóm Nhỏ (đã đối chiếu 4,2 kg)" },
    { label: "Tắm và sấy", value: "150.000đ" },
    { label: "Cắt tỉa lông", value: "120.000đ" },
  ]);
});

test("cách tính phí trả muộn: trả dự kiến và trả thực tế kèm số phút trễ", () => {
  assert.deepEqual(buildBreakdown(lateFee), [
    { label: "Trả dự kiến", value: "T4 11/11, 10:00" },
    { label: "Trả thực tế", value: "T4 11/11, 11:40 (trễ 100 phút)" },
  ]);
  const notYetRecorded = structuredClone(lateFee);
  notYetRecorded.appointment.actualCheckOut = null;
  assert.deepEqual(buildBreakdown(notYetRecorded), [{ label: "Trả dự kiến", value: "T4 11/11, 10:00" }]);
});

test("chọn khoản: khoản đã bấm, rồi khoản của ?appointmentId=, rồi khoản đầu tiên", () => {
  const rows = [cashStay, secondStay, lateFee, spa];
  assert.equal(resolveSelectedRow(rows, secondStay.payment.paymentId, lateFee.appointment.appointmentId), secondStay);
  assert.equal(resolveSelectedRow(rows, null, lateFee.appointment.appointmentId), lateFee);
  assert.equal(resolveSelectedRow(rows, null, "không-tồn-tại"), cashStay);
  assert.equal(resolveSelectedRow(rows, "đã-thanh-toán-xong", null), cashStay);
  assert.equal(resolveSelectedRow([], null, null), null);
});

test("nhập số tiền: số nguyên, dấu phân nhóm đúng ba chữ số, không số thập phân", () => {
  assert.equal(parseMoneyInput("250000"), 250000);
  assert.equal(parseMoneyInput(" 250.000 "), 250000);
  assert.equal(parseMoneyInput("250,000"), 250000);
  assert.equal(parseMoneyInput("1.250.000"), 1250000);
  assert.equal(parseMoneyInput("0"), 0);
  for (const bad of ["", "abc", "250.5", "250,50", "1.25.000", "-100", "250.000đ", "1234567890123"]) {
    assert.equal(parseMoneyInput(bad), null, bad);
  }
});

test("kiểm tra số tiền thực nhận: bắt buộc, hợp lệ, không thấp hơn số phải trả", () => {
  const validate = validateReceivedAmount(250000);
  assert.equal(validate("250.000"), true);
  assert.equal(validate("300.000"), true);
  assert.equal(validate(""), FORM_MESSAGES.receivedAmountRequired);
  assert.equal(validate("  "), FORM_MESSAGES.receivedAmountRequired);
  assert.equal(validate("abc"), FORM_MESSAGES.receivedAmountInvalid);
  assert.equal(validate("249.999"), "Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.");
});

test("mặc định: tiền mặt, nhận đúng số phải trả, chưa tích kiểm tra tiền vào tài khoản", () => {
  assert.deepEqual(createCounterFormValues(250000), { method: "Cash", receivedAmount: "250.000", bankConfirmed: false });
  assert.deepEqual(COUNTER_METHOD_ORDER, ["Cash", "BankQR"]);
  assert.equal(isCounterMethod("Cash"), true);
  assert.equal(isCounterMethod("BankQR"), true);
  assert.equal(isCounterMethod("Online"), false);
});

test("trạng thái form: tiền thối lại, còn thiếu và khóa nút xác nhận", () => {
  const base = createCounterFormValues(250000);
  assert.deepEqual(getCounterFormState(base, 250000), {
    received: 250000,
    change: 0,
    shortfall: 0,
    isInsufficient: false,
    isLocked: false,
  });
  assert.deepEqual(getCounterFormState({ ...base, receivedAmount: "300.000" }, 250000), {
    received: 300000,
    change: 50000,
    shortfall: 0,
    isInsufficient: false,
    isLocked: false,
  });
  assert.deepEqual(getCounterFormState({ ...base, receivedAmount: "200.000" }, 250000), {
    received: 200000,
    change: 0,
    shortfall: 50000,
    isInsufficient: true,
    isLocked: true,
  });
});

test("trạng thái form: nhập chưa hợp lệ không khóa nút; chuyển khoản QR khóa tới khi tích ô kiểm tra", () => {
  const base = createCounterFormValues(250000);
  assert.equal(getCounterFormState({ ...base, receivedAmount: "" }, 250000).isLocked, false);
  assert.equal(getCounterFormState({ ...base, receivedAmount: "abc" }, 250000).received, null);
  const qr = { ...base, method: "BankQR" };
  assert.equal(getCounterFormState(qr, 250000).isLocked, true);
  assert.equal(getCounterFormState({ ...qr, bankConfirmed: true }, 250000).isLocked, false);
  assert.equal(getCounterFormState({ ...qr, bankConfirmed: true, receivedAmount: "1" }, 250000).isLocked, true);
});

test("yêu cầu gửi đi chỉ có method và receivedAmount, không có amount", () => {
  const request = toCounterPaymentRequest({ method: "BankQR", receivedAmount: "250.000", bankConfirmed: true });
  assert.deepEqual(request, { method: "BankQR", receivedAmount: 250000 });
  assert.equal("amount" in request, false);
  assert.throws(() => toCounterPaymentRequest({ method: "Cash", receivedAmount: "abc", bankConfirmed: false }));
});

test("API mô phỏng: chỉ trả khoản chưa thu, ghi nhận xong thì khoản biến mất, không đổi số tiền", async () => {
  resetMockPaymentStore(NOW);
  const first = await mockListCounterPayments();
  assert.equal(first.rows.length, 4);
  assert.equal(first.confirmerName, "Thu Hà");
  const target = first.rows[0].payment;
  const result = await mockPayAtCounter(target.paymentId, { method: "Cash", receivedAmount: 300000 });
  assert.deepEqual(result, { status: "Paid" });
  const second = await mockListCounterPayments();
  assert.equal(second.rows.length, 3);
  assert.equal(second.rows.some((row) => row.payment.paymentId === target.paymentId), false);
  assert.equal(second.rows.find((row) => row.payment.kind === "LateFee")?.payment.amount, 100000);
});

test("API mô phỏng: kết quả trả về là bản sao, sửa bản sao không làm đổi dữ liệu mô phỏng", async () => {
  resetMockPaymentStore(NOW);
  const data = await mockListCounterPayments();
  data.rows[0].payment.amount = 1;
  const again = await mockListCounterPayments();
  assert.equal(again.rows[0].payment.amount, 250000);
});

test("API mô phỏng: nhận thấp hơn số phải trả thì từ chối 409 AMOUNT_MISMATCH và khoản vẫn chưa thu", async () => {
  resetMockPaymentStore(NOW);
  await assert.rejects(
    () => mockPayAtCounter(cashStay.payment.paymentId, { method: "Cash", receivedAmount: 249999 }),
    (error) => error.status === 409 && error.code === "AMOUNT_MISMATCH",
  );
  assert.equal((await mockListCounterPayments()).rows.length, 4);
});

test("API mô phỏng: khoản không tồn tại trả 404", async () => {
  resetMockPaymentStore(NOW);
  await assert.rejects(
    () => mockPayAtCounter("không-có", { method: "Cash", receivedAmount: 1 }),
    (error) => error.status === 404,
  );
});
