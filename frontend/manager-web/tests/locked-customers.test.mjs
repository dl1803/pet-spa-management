import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { ApiError } from "../lib/api/errors.ts";
import { LockedCustomerTable } from "../features/customers/components/locked-customer-table.tsx";
import { UnlockBookingDialog } from "../features/customers/components/unlock-booking-dialog.tsx";
import { LOCKED_CUSTOMER_MESSAGES } from "../features/customers/list.ts";
import { MOCK_LOCKED_CUSTOMERS, unlockMockCustomer } from "../features/customers/mock-data.ts";
import { LockedCustomersScreen } from "../features/customers/screens/locked-customers-screen.tsx";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const [MAI, LONG] = MOCK_LOCKED_CUSTOMERS;

test("unlockMockCustomer: bỏ đúng khách, không sửa danh sách đầu vào", () => {
  const next = unlockMockCustomer(MOCK_LOCKED_CUSTOMERS, MAI.customerId);
  assert.deepEqual(next.map((c) => c.customerId), [LONG.customerId]);
  assert.equal(MOCK_LOCKED_CUSTOMERS.length, 2);
  assert.deepEqual(unlockMockCustomer(next, LONG.customerId), []);
});

test("unlockMockCustomer: khách không còn bị khóa → 409 CUSTOMER_NOT_LOCKED", () => {
  assert.throws(
    () => unlockMockCustomer(MOCK_LOCKED_CUSTOMERS, "khong-co"),
    (error) => error instanceof ApiError && error.status === 409 && error.code === "CUSTOMER_NOT_LOCKED",
  );
});

test("LockedCustomerTable: hàng khách, số điện thoại định dạng, email trống hiện gạch, nút có nhãn rõ", () => {
  const html = renderToStaticMarkup(React.createElement(LockedCustomerTable, { customers: MOCK_LOCKED_CUSTOMERS, onUnlock: noop }));
  assert.equal(count(html, /<tr /g), 2);
  assert.ok(html.includes("Hoàng Thị Mai") && html.includes("0908 112 456") && html.includes("0931 908 776"));
  assert.ok(html.includes('aria-label="Gỡ khóa tự đặt lịch của Bùi Đức Long"'));
  assert.ok(!html.includes("Vắng mặt trong 30 ngày"));
  const withEmail = renderToStaticMarkup(
    React.createElement(LockedCustomerTable, { customers: [{ ...MAI, email: "mai@example.com" }], onUnlock: noop }),
  );
  assert.ok(withEmail.includes("mai@example.com"));
});

test("LockedCustomerTable: danh sách trống hiện trạng thái rỗng, không có bảng", () => {
  const html = renderToStaticMarkup(React.createElement(LockedCustomerTable, { customers: [], onUnlock: noop }));
  assert.ok(html.includes(LOCKED_CUSTOMER_MESSAGES.emptyTitle));
  assert.ok(!html.includes("<table"));
});

test("UnlockBookingDialog: tiêu đề, mô tả, hệ quả, tên khách và nút xác nhận", () => {
  const html = renderToStaticMarkup(React.createElement(UnlockBookingDialog, { customer: MAI, onConfirm: noop, onCancel: noop }));
  assert.ok(html.includes("Gỡ khóa tự đặt lịch?") && html.includes("Khách đã liên hệ cửa hàng qua hotline."));
  assert.ok(html.includes("Khách hàng: Hoàng Thị Mai.") && html.includes(LOCKED_CUSTOMER_MESSAGES.dialogEffect));
  assert.ok(html.includes("Quay lại") && html.includes(">Gỡ khóa<"));
});

test("LockedCustomersScreen: tiêu đề, 2 khách, ghi chú, chưa mở hộp thoại", () => {
  const html = renderToStaticMarkup(
    React.createElement(ToastProvider, null, React.createElement(LockedCustomersScreen)),
  );
  assert.ok(html.includes(LOCKED_CUSTOMER_MESSAGES.title) && html.includes(LOCKED_CUSTOMER_MESSAGES.subtitle));
  assert.equal(count(html, /aria-label="Gỡ khóa tự đặt lịch của /g), 2);
  assert.ok(html.includes(LOCKED_CUSTOMER_MESSAGES.note));
  assert.ok(!html.includes("<dialog"));
});
