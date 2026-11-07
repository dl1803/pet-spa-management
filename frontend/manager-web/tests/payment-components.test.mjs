import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CounterPaymentDialog } from "../features/payments/components/counter-payment-dialog.tsx";
import { PaymentFilters } from "../features/payments/components/payment-filters.tsx";
import { PaymentsScreenFallback } from "../features/payments/components/payments-screen-fallback.tsx";
import { PaymentsTable } from "../features/payments/components/payments-table.tsx";
import { MOCK_PAYMENTS } from "../features/payments/mock-data.ts";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const [cốm, bông, bi] = MOCK_PAYMENTS;

test("PaymentsTable: 6 cột, mã lịch là chữ (không liên kết), chỉ khoản chưa thanh toán có nút Ghi nhận", () => {
  const html = render(PaymentsTable, { rows: MOCK_PAYMENTS.slice(0, 3), onRecord: noop });
  assert.equal(count(html, /<th /g), 6);
  for (const text of ["Lịch hẹn", "Khoản", "Số tiền", "Trạng thái", "Ghi nhận", "Thao tác"]) assert.ok(html.includes(text), text);
  assert.ok(html.includes("LH-5F1C0402") && html.includes("Cốm, Phạm Quốc Huy"));
  assert.ok(html.includes("Tiền lưu trú") && html.includes("250.000đ") && html.includes("440.000đ") && html.includes("150.000đ"));
  assert.equal(count(html, /aria-label="Ghi nhận thanh toán /g), 2);
  assert.ok(html.includes('aria-label="Ghi nhận thanh toán LH-5F1C0402"'));
  assert.ok(html.includes("Trực tuyến") && html.includes("16:42 05/10, xác nhận qua cổng"));
  assert.ok(!html.includes("<a "));
});

test("PaymentsTable: khoản chưa thanh toán hiện “–” ở cột Ghi nhận; thiếu tên thì bỏ dòng phụ", () => {
  const html = render(PaymentsTable, { rows: [{ ...cốm, petName: undefined, customerName: undefined }], onRecord: noop });
  assert.ok(html.includes("–"));
  assert.ok(!html.includes("Cốm") && !html.includes("Phạm Quốc Huy"));
});

test("PaymentFilters: 3 chip trạng thái (số trên chip Chưa thanh toán), 2 ô chọn đủ lựa chọn theo thứ tự UI demo", () => {
  const html = render(PaymentFilters, {
    status: "Unpaid", kind: "all", method: "all", unpaidCount: 2,
    onStatusChange: noop, onKindChange: noop, onMethodChange: noop,
  });
  assert.equal(count(html, /aria-pressed/g), 3);
  assert.match(html, /aria-pressed="true"[^>]*>Chưa thanh toán<span[^>]*>2</);
  assert.equal(count(html, /aria-pressed="true"/g), 1);
  assert.ok(html.indexOf("Mọi khoản") < html.indexOf("Khoản spa") && html.indexOf("Khoản spa") < html.indexOf("Tiền lưu trú") && html.indexOf("Tiền lưu trú") < html.indexOf("Phí trả muộn"));
  assert.ok(html.indexOf("Mọi phương thức") < html.indexOf("Tiền mặt") && html.indexOf("Tiền mặt") < html.indexOf("Chuyển khoản QR") && html.indexOf("Chuyển khoản QR") < html.indexOf("Trực tuyến"));
  assert.ok(html.includes('aria-label="Lọc theo khoản"') && html.includes('aria-label="Lọc theo phương thức"'));
});

test("CounterPaymentDialog: tiêu đề, mô tả, số tiền phải trả, 2 phương thức (không có Trực tuyến), số tiền thực nhận mặc định", () => {
  const html = render(CounterPaymentDialog, { payment: cốm, onSubmit: noop, onClose: noop });
  assert.ok(html.includes("Ghi nhận thanh toán tại quầy"));
  assert.ok(html.includes("Cốm, tiền lưu trú, LH-5F1C0402."));
  assert.ok(html.includes("Số tiền phải trả") && html.includes("250.000đ"));
  assert.equal(count(html, /aria-pressed/g), 2);
  assert.match(html, /aria-pressed="true"[^>]*>.*Tiền mặt/);
  assert.ok(html.includes("Chuyển khoản QR") && !html.includes("Trực tuyến"));
  // Số tiền mặc định đi qua defaultValues của React Hook Form (đã có createCounterFormValues kiểm tra), không in thành thuộc tính value.
  assert.match(html, /<input[^>]*inputMode="numeric"/);
  assert.ok(html.includes("Số tiền thực nhận") && html.includes("Phải bằng hoặc lớn hơn số tiền phải trả."));
  assert.ok(html.includes("Hủy bỏ") && html.includes("Xác nhận đã thanh toán"));
  assert.ok(html.includes("data-initial-focus"));
  assert.match(html, /<button[^>]*type="submit"/);
  assert.ok(!html.includes('role="alert"'));
});

test("CounterPaymentDialog: số tiền phải trả lấy từ amount của từng khoản, không tính lại ở client", () => {
  const html = render(CounterPaymentDialog, { payment: bông, onSubmit: noop, onClose: noop });
  assert.ok(html.includes("440.000đ") && html.includes("Bông, tiền lưu trú, LH-5F1C040B."));
  assert.ok(!html.includes("250.000"));
});

test("PaymentsScreenFallback: giữ tiêu đề và báo đang tải", () => {
  const html = render(PaymentsScreenFallback, {});
  assert.ok(html.includes("<h1>Thanh toán</h1>") && html.includes("Đang tải danh sách thanh toán"));
  assert.ok(html.includes('aria-busy="true"'));
});

test("bảng không gắn nút Ghi nhận cho khoản đã thanh toán", () => {
  const html = render(PaymentsTable, { rows: [bi], onRecord: noop });
  assert.equal(count(html, /aria-label="Ghi nhận thanh toán /g), 0);
});
