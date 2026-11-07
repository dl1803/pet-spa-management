import assert from "node:assert/strict";
import test from "node:test";
import { FORM_MESSAGES } from "../features/payments/forms.ts";
import {
  PAYMENT_PAGE_SIZE,
  countPayments,
  describeParties,
  describePayment,
  describeRecord,
  filterPageRows,
  getPageRange,
  parsePage,
  parsePaymentKindFilter,
  parsePaymentMethodFilter,
  parsePaymentStatusFilter,
  resolvePage,
  summarizeUnpaid,
} from "../features/payments/list.ts";
import { MOCK_PAYMENTS, getMockPaymentPage, recordMockCounterPayment } from "../features/payments/mock-data.ts";
import { ApiError } from "../lib/api/errors.ts";

const [cốm, bông, bi] = MOCK_PAYMENTS;

test("dữ liệu mô phỏng: 24 khoản, 2 chưa thanh toán đứng đầu, mã thanh toán và mã lịch không trùng", () => {
  assert.equal(MOCK_PAYMENTS.length, 24);
  assert.deepEqual(MOCK_PAYMENTS.map((payment) => payment.status).slice(0, 3), ["Unpaid", "Unpaid", "Paid"]);
  assert.equal(countPayments(MOCK_PAYMENTS, "Unpaid"), 2);
  assert.equal(countPayments(MOCK_PAYMENTS, "Paid"), 22);
  assert.equal(countPayments(MOCK_PAYMENTS, "all"), 24);
  assert.equal(new Set(MOCK_PAYMENTS.map((payment) => payment.paymentId)).size, 24);
  assert.equal(new Set(MOCK_PAYMENTS.map((payment) => payment.appointmentId)).size, 24);
  for (const payment of MOCK_PAYMENTS.filter((item) => item.status === "Paid")) {
    assert.ok(payment.method && payment.paidAt && payment.receivedAmount === payment.amount, payment.paymentId);
    if (payment.method === "Online") assert.equal(payment.kind, "Spa", "trực tuyến chỉ có ở khoản spa");
  }
  for (const payment of MOCK_PAYMENTS.filter((item) => item.status === "Unpaid")) {
    assert.equal(payment.method, undefined);
    assert.equal(payment.paidAt, undefined);
  }
});

test("tham số URL: giá trị lạ hoặc thiếu → Tất cả, trang → 1", () => {
  assert.equal(parsePaymentStatusFilter("Unpaid"), "Unpaid");
  assert.equal(parsePaymentStatusFilter("Paid"), "Paid");
  assert.equal(parsePaymentStatusFilter("paid"), "all");
  assert.equal(parsePaymentStatusFilter(null), "all");
  assert.equal(parsePaymentKindFilter("LateFee"), "LateFee");
  assert.equal(parsePaymentKindFilter("Other"), "all");
  assert.equal(parsePaymentMethodFilter("BankQR"), "BankQR");
  assert.equal(parsePaymentMethodFilter("Momo"), "all");
  assert.equal(parsePage("3"), 3);
  for (const value of [null, "", "0", "-1", "1.5", "abc", "9".repeat(400)]) assert.equal(parsePage(value), 1, String(value));
});

test("resolvePage: trang quá lớn lùi về trang cuối, danh sách rỗng vẫn là trang 1", () => {
  assert.equal(resolvePage(1, 24, 20), 1);
  assert.equal(resolvePage(2, 24, 20), 2);
  assert.equal(resolvePage(9, 24, 20), 2);
  assert.equal(resolvePage(5, 0, 20), 1);
  assert.equal(resolvePage(2, 20, 20), 1);
});

test("getMockPaymentPage: lọc theo trạng thái rồi cắt trang 20 khoản; total là số khoản khớp trạng thái", () => {
  assert.equal(PAYMENT_PAGE_SIZE, 20);
  const all1 = getMockPaymentPage(MOCK_PAYMENTS, { status: "all", page: 1, pageSize: 20 });
  assert.equal(all1.items.length, 20);
  assert.equal(all1.total, 24);
  const all2 = getMockPaymentPage(MOCK_PAYMENTS, { status: "all", page: 2, pageSize: 20 });
  assert.equal(all2.items.length, 4);
  assert.deepEqual([...all1.items, ...all2.items].map((item) => item.paymentId), MOCK_PAYMENTS.map((item) => item.paymentId));
  const unpaid = getMockPaymentPage(MOCK_PAYMENTS, { status: "Unpaid", page: 1, pageSize: 20 });
  assert.deepEqual(unpaid.items.map((item) => item.paymentId), [cốm.paymentId, bông.paymentId]);
  assert.equal(unpaid.total, 2);
  const paid = getMockPaymentPage(MOCK_PAYMENTS, { status: "Paid", page: 2, pageSize: 20 });
  assert.equal(paid.total, 22);
  assert.equal(paid.items.length, 2);
});

test("getPageRange: “Hiển thị a – b trong n khoản”", () => {
  assert.deepEqual(getPageRange(1, 20, 24), { from: 1, to: 20 });
  assert.deepEqual(getPageRange(2, 20, 24), { from: 21, to: 24 });
  assert.deepEqual(getPageRange(1, 20, 2), { from: 1, to: 2 });
  assert.deepEqual(getPageRange(1, 20, 0), { from: 0, to: 0 });
});

test("summarizeUnpaid: cộng đúng amount của các khoản chưa thanh toán, không phụ thuộc bộ lọc", () => {
  assert.deepEqual(summarizeUnpaid(MOCK_PAYMENTS), { count: 2, total: 690000 });
  assert.deepEqual(summarizeUnpaid([]), { count: 0, total: 0 });
});

test("filterPageRows: lọc khoản và phương thức trên trang đang xem; khoản chưa thanh toán không khớp bộ lọc phương thức", () => {
  const page = getMockPaymentPage(MOCK_PAYMENTS, { status: "all", page: 1, pageSize: 20 }).items;
  assert.equal(filterPageRows(page, "all", "all").length, 20);
  assert.ok(filterPageRows(page, "Stay", "all").every((row) => row.kind === "Stay"));
  assert.ok(filterPageRows(page, "all", "Cash").every((row) => row.method === "Cash"));
  assert.ok(!filterPageRows(page, "all", "Cash").some((row) => row.status === "Unpaid"));
  assert.ok(filterPageRows(page, "Stay", "all").some((row) => row.status === "Unpaid"));
  assert.ok(filterPageRows(page, "LateFee", "BankQR").every((row) => row.kind === "LateFee" && row.method === "BankQR"));
});

test("describePayment, describeParties: có tên thì “<tên>, <khoản>, <mã>.”, thiếu tên thì bỏ phần tên", () => {
  assert.equal(describePayment(cốm), "Cốm, tiền lưu trú, LH-5F1C0402.");
  assert.equal(describePayment({ ...cốm, petName: undefined }), "Tiền lưu trú, LH-5F1C0402.");
  assert.equal(describePayment({ ...cốm, kind: "Spa" }), "Cốm, khoản spa, LH-5F1C0402.");
  assert.equal(describeParties(cốm), "Cốm, Phạm Quốc Huy");
  assert.equal(describeParties({ ...cốm, customerName: undefined }), "Cốm");
  assert.equal(describeParties({ ...cốm, petName: undefined, customerName: undefined }), null);
});

test("describeRecord: khoản chưa thanh toán không có ghi nhận; trực tuyến ghi “xác nhận qua cổng”; giờ theo múi giờ Việt Nam", () => {
  assert.equal(describeRecord(cốm), null);
  assert.deepEqual(describeRecord(bi), { method: "Trực tuyến", detail: "16:42 05/10, xác nhận qua cổng" });
  const bankQr = MOCK_PAYMENTS.find((payment) => payment.method === "BankQR");
  assert.deepEqual(describeRecord(bankQr), { method: "Chuyển khoản QR", detail: "11:35 05/10" });
  assert.deepEqual(describeRecord({ ...bankQr, paidAt: null }), { method: "Chuyển khoản QR", detail: null });
});

test("ghi nhận tại quầy: khoản thành Paid với phương thức, số tiền nhận, thời điểm; amount giữ nguyên; danh sách cũ không bị sửa", () => {
  const paidAt = "2026-10-06T09:30:00.000Z";
  const next = recordMockCounterPayment(MOCK_PAYMENTS, cốm.paymentId, { method: "BankQR", receivedAmount: 300000 }, paidAt);
  const updated = next.find((payment) => payment.paymentId === cốm.paymentId);
  assert.deepEqual(updated, { ...cốm, status: "Paid", method: "BankQR", receivedAmount: 300000, paidAt });
  assert.equal(updated.amount, 250000);
  assert.equal(next.length, 24);
  assert.deepEqual(next.filter((payment) => payment !== updated).map((payment) => payment.paymentId), MOCK_PAYMENTS.filter((payment) => payment.paymentId !== cốm.paymentId).map((payment) => payment.paymentId));
  assert.equal(cốm.status, "Unpaid", "không sửa danh sách cũ");
  assert.deepEqual(summarizeUnpaid(next), { count: 1, total: 440000 });
  assert.equal(describeRecord(updated).method, "Chuyển khoản QR");
});

test("ghi nhận thiếu tiền: 409 AMOUNT_MISMATCH, danh sách giữ nguyên; đúng bằng số tiền phải trả thì được", () => {
  assert.throws(
    () => recordMockCounterPayment(MOCK_PAYMENTS, cốm.paymentId, { method: "Cash", receivedAmount: 249999 }, "2026-10-06T09:30:00.000Z"),
    (error) => error instanceof ApiError && error.status === 409 && error.code === "AMOUNT_MISMATCH" && error.title === FORM_MESSAGES.receivedAmountInsufficient,
  );
  assert.equal(cốm.status, "Unpaid");
  const next = recordMockCounterPayment(MOCK_PAYMENTS, cốm.paymentId, { method: "Cash", receivedAmount: 250000 }, "2026-10-06T09:30:00.000Z");
  assert.equal(next[0].status, "Paid");
});

test("ghi nhận khoản không tồn tại: 404 NOT_FOUND", () => {
  assert.throws(
    () => recordMockCounterPayment(MOCK_PAYMENTS, "khong-co", { method: "Cash", receivedAmount: 1 }, "2026-10-06T09:30:00.000Z"),
    (error) => error instanceof ApiError && error.status === 404 && error.code === "NOT_FOUND",
  );
});
