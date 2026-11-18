import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getCheckOutGate } from "../features/reception-check-out/check-out.ts";
import { ActualReturnFields, CheckOutHeader, StayInfoTiles } from "../features/reception-check-out/components/check-out-details.tsx";
import { CheckOutConfirmCard } from "../features/reception-check-out/components/check-out-confirm.tsx";
import { CheckOutPaymentsCard } from "../features/reception-check-out/components/check-out-payments.tsx";
import { ReturnList } from "../features/reception-check-out/components/return-list.tsx";
import { createMockCheckOutEntries, MOCK_CHECK_OUT_IDS } from "../features/reception-check-out/mock-data.ts";

const NOW = new Date("2026-11-08T02:00:00Z"); // 09:00 ngày 08/11/2026 ở cửa hàng
const render = (element) => renderToStaticMarkup(element);
const h = React.createElement;
const entries = createMockCheckOutEntries(NOW);
const dataOf = (id) => entries.find((entry) => entry.appointment.appointmentId === id);
const ids = MOCK_CHECK_OUT_IDS;

test("CheckOutHeader: tên, loài, giống, mã lịch, chuồng, chủ và huy hiệu Đang lưu trú", () => {
  const html = render(h(CheckOutHeader, { data: dataOf(ids.tuyet) }));
  assert.match(html, /Tuyết, mèo Ba Tư/);
  assert.match(html, /LH-A1000000\. Chuồng B1\. Chủ: Nguyễn Hải Yến/);
  assert.match(html, /Đang lưu trú/);
});

test("StayInfoTiles: chuồng, giờ nhận và giờ trả dự kiến; thiếu dữ liệu thì hiện dấu gạch", () => {
  const { appointment, cage } = dataOf(ids.tuyet);
  const html = render(h(StayInfoTiles, { appointment, cage }));
  assert.match(html, />Chuồng<\/div><div[^>]*>B1, mèo nhóm Vừa</);
  assert.match(html, />Nhận<\/div><div[^>]*>10:00, 06\/11</);
  assert.match(html, />Trả dự kiến<\/div><div[^>]*>18:00, 08\/11</);
  const empty = render(h(StayInfoTiles, { appointment: { ...appointment, plannedCheckIn: null, plannedCheckOut: null }, cage: null }));
  assert.equal((empty.match(/>—</g) ?? []).length, 3);
});

test("ActualReturnFields: ngày và giờ hiện tại, chỉ đọc", () => {
  const html = render(h(ActualReturnFields, { nowMs: Date.parse("2026-11-08T12:15:00Z") }));
  assert.match(html, />Ngày trả thực tế<\/div><div[^>]*>08\/11\/2026</);
  assert.match(html, />Giờ trả thực tế<\/div><div[^>]*>19:15</);
  assert.doesNotMatch(html, /<input/);
});

test("CheckOutPaymentsCard chưa có phí trả muộn: tiền lưu trú đã thanh toán, phí trả muộn Không phát sinh, không có nút thu", () => {
  const { payments, appointment } = dataOf(ids.tuyet);
  const html = render(h(CheckOutPaymentsCard, { payments, appointmentId: appointment.appointmentId }));
  assert.match(html, /Thanh toán/);
  assert.match(html, /Tiền lưu trú/);
  assert.match(html, /420\.000đ/);
  assert.match(html, /06\/11, tiền mặt/);
  assert.match(html, /Đã thanh toán/);
  assert.match(html, /Phí trả muộn/);
  assert.match(html, /Không phát sinh/);
  assert.doesNotMatch(html, /Thu phí trả muộn|<a /);
});

test("CheckOutPaymentsCard phí trả muộn chưa thanh toán: số tiền, huy hiệu Chưa thanh toán và nút Thu phí trả muộn", () => {
  const { payments, appointment } = dataOf(ids.mun);
  const unpaid = [...payments, { paymentId: "x", appointmentId: appointment.appointmentId, kind: "LateFee", amount: 50000, status: "Unpaid", method: null, receivedAmount: null, paidAt: null }];
  const html = render(h(CheckOutPaymentsCard, { payments: unpaid, appointmentId: appointment.appointmentId }));
  assert.match(html, /50\.000đ/);
  assert.match(html, /Chưa thanh toán/);
  assert.doesNotMatch(html, /Không phát sinh/);
  assert.match(html, /<a [^>]*href="\/thanh-toan\?appointmentId=a1000000-0000-4000-8000-000000000012"[^>]*>.*Thu phí trả muộn<\/a>/);
});

test("CheckOutPaymentsCard phí trả muộn đã thanh toán: số tiền, ngày và phương thức, không còn nút thu", () => {
  const { payments, appointment } = dataOf(ids.nam);
  const html = render(h(CheckOutPaymentsCard, { payments, appointmentId: appointment.appointmentId }));
  assert.match(html, /100\.000đ/);
  assert.match(html, /tiền mặt|chuyển khoản/);
  assert.doesNotMatch(html, /Chưa thanh toán|Thu phí trả muộn|Không phát sinh/);
});

test("CheckOutConfirmCard sẵn sàng: nút bật, ghi chú chuồng sẽ trống, không có lý do khóa", () => {
  const html = render(h(CheckOutConfirmCard, { gate: { ready: true }, cageCode: "B1", isSubmitting: false, error: null, onConfirm: () => {} }));
  assert.match(html, /Xác nhận trả thú cưng<\/button>/);
  assert.doesNotMatch(html, /disabled=""/);
  assert.match(html, /Sau khi xác nhận, lịch chuyển Hoàn tất và chuồng B1 trống để nhận bé khác\./);
  assert.doesNotMatch(html, /Cần thu phí|aria-describedby/);
});

test("CheckOutConfirmCard bị khóa: nút vô hiệu gắn lý do bằng aria-describedby", () => {
  const gate = getCheckOutGate([{ kind: "LateFee", status: "Unpaid" }]);
  const html = render(h(CheckOutConfirmCard, { gate, cageCode: null, isSubmitting: false, error: null, onConfirm: () => {} }));
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-describedby="check-out-lock-reason"|<button[^>]*aria-describedby="check-out-lock-reason"[^>]*disabled=""/);
  assert.match(html, /<p id="check-out-lock-reason"[^>]*>.*Cần thu phí trả muộn trước khi hoàn tất\./);
  assert.match(html, /Sau khi xác nhận, lịch chuyển Hoàn tất\./);
});

test("CheckOutConfirmCard: hiện lỗi từ API khi xác nhận bị từ chối", () => {
  const error = new Error("Phí trả muộn chưa được thanh toán.");
  const html = render(h(CheckOutConfirmCard, { gate: { ready: true }, cageCode: "B1", isSubmitting: false, error, onConfirm: () => {} }));
  assert.match(html, /role="alert"/);
});

test("ReturnList: mỗi lịch có tên, chuồng, chủ, giờ trả và nút Chọn dẫn tới đúng lịch; danh sách rỗng có thông báo", () => {
  const html = render(h(ReturnList, { items: entries }));
  assert.match(html, /Lịch trả hôm nay/);
  assert.match(html, /Tuyết/);
  assert.match(html, /Chuồng B1\. Chủ: Nguyễn Hải Yến/);
  assert.match(html, /Trả dự kiến 18:00/);
  assert.match(html, /<a (?=[^>]*href="\/tra-thu-cung\?appointmentId=a1000000-0000-4000-8000-000000000008")(?=[^>]*aria-label="Trả thú cưng Tuyết")[^>]*>Chọn<\/a>/);
  assert.equal((html.match(/>Chọn<\/a>/g) ?? []).length, 3);
  const empty = render(h(ReturnList, { items: [] }));
  assert.match(empty, /Hôm nay chưa có lịch trả/);
  assert.doesNotMatch(empty, /<a /);
});
