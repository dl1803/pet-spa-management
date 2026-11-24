import assert from "node:assert/strict";
import test from "node:test";
import {
  PAYMENT_PAGE_SIZE,
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
  summarizeUnpaidPage,
} from "../features/payments/list.ts";
import { MOCK_PAYMENTS } from "./fixtures/payments.ts";

const [cốm, , bi] = MOCK_PAYMENTS;

test("dữ liệu mẫu: 24 khoản, 2 chưa thanh toán đứng đầu, mã thanh toán và mã lịch không trùng", () => {
  assert.equal(MOCK_PAYMENTS.length, 24);
  assert.deepEqual(MOCK_PAYMENTS.map((payment) => payment.status).slice(0, 3), ["Unpaid", "Unpaid", "Paid"]);
  assert.equal(MOCK_PAYMENTS.filter((payment) => payment.status === "Unpaid").length, 2);
  assert.equal(MOCK_PAYMENTS.filter((payment) => payment.status === "Paid").length, 22);
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

test("PAYMENT_PAGE_SIZE là 20 khoản mỗi trang", () => {
  assert.equal(PAYMENT_PAGE_SIZE, 20);
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
  const page = MOCK_PAYMENTS.slice(0, 20);
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

test("summarizeUnpaidPage: số khoản lấy từ total của server, tổng tiền cộng trên các khoản đã tải", () => {
  const unpaid = MOCK_PAYMENTS.filter((payment) => payment.status === "Unpaid");
  assert.deepEqual(summarizeUnpaidPage({ page: 1, pageSize: 100, total: 2, items: unpaid }), { count: 2, total: 690000, loaded: 2, isPartial: false });
  assert.deepEqual(summarizeUnpaidPage({ page: 1, pageSize: 100, total: 0, items: [] }), { count: 0, total: 0, loaded: 0, isPartial: false });
  // Còn khoản chưa nằm trong trang đã tải: số khoản theo total, tổng tiền chỉ của các khoản đã tải và được đánh dấu một phần.
  assert.deepEqual(summarizeUnpaidPage({ page: 1, pageSize: 100, total: 130, items: unpaid }), { count: 130, total: 690000, loaded: 2, isPartial: true });
});
