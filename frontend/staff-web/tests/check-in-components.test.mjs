import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CheckInHeader } from "../features/reception-check-in/components/check-in-header.tsx";
import { CheckInSummary } from "../features/reception-check-in/components/check-in-summary.tsx";
import { CostConfirmationNotice } from "../features/reception-check-in/components/cost-confirmation-notice.tsx";
import { CostResponseDialog } from "../features/reception-check-in/components/cost-response-dialog.tsx";
import { HotelWeightStep } from "../features/reception-check-in/components/hotel-weight-step.tsx";
import { WeightField } from "../features/reception-check-in/components/weight-field.tsx";
import { WeightOutcomeNotice } from "../features/reception-check-in/components/weight-outcome-notice.tsx";
import { createMockCheckInEntries, MOCK_CHECK_IN_IDS } from "../features/reception-check-in/mock-data.ts";

const NOW = new Date("2026-11-08T02:00:00Z"); // 09:00 ngày 08/11/2026 ở cửa hàng
const render = (element) => renderToStaticMarkup(element);
const h = React.createElement;
const entries = createMockCheckInEntries(NOW);
const dataOf = (id) => entries.find((entry) => entry.data.appointment.appointmentId === id).data;
const REGISTRATION = { name: "actualWeight", onChange: async () => {}, onBlur: async () => {}, ref: () => {} };

test("WeightField: ô nhập có nhãn, dấu *, hậu tố kg, bàn phím số thập phân và gắn lỗi", () => {
  const html = render(h(WeightField, { id: "w", registration: REGISTRATION, error: "Vui lòng nhập cân nặng thực tế lớn hơn 0." }));
  assert.match(html, /<label[^>]*for="w"[^>]*>Cân nặng thực tế \(kg\)<span[^>]*>\*<\/span><\/label>/);
  assert.match(html, /inputMode="decimal"/);
  assert.match(html, /name="actualWeight"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="w-error"/);
  assert.match(html, /h-\[52px\]/);
  assert.match(html, />kg<\/span>/);
  assert.match(html, /Vui lòng nhập cân nặng thực tế lớn hơn 0\./);
});

test("WeightField chỉ đọc: hiện giá trị đã ghi, không có dấu *, bị vô hiệu hóa", () => {
  const html = render(h(WeightField, { id: "w", readOnlyValue: "11,2" }));
  assert.match(html, /value="11,2"/);
  assert.match(html, /readOnly=""/);
  assert.match(html, /\sdisabled=""/);
  assert.doesNotMatch(html, /text-danger">\*/);
});

test("CheckInHeader: lịch spa nêu mã, giờ, nhân viên; lịch lưu trú nêu thời gian và chuồng", () => {
  const spa = render(h(CheckInHeader, { data: dataOf(MOCK_CHECK_IN_IDS.spaBong) }));
  assert.match(spa, /<h2>Bông, chó Poodle<\/h2>/);
  assert.match(spa, /LH-A1000000\. Spa 09:00 – 11:00\. Nhân viên phụ trách: Hạnh</);
  assert.match(spa, /Đã xác nhận/);
  const hotel = render(h(CheckInHeader, { data: dataOf(MOCK_CHECK_IN_IDS.hotelCom) }));
  assert.match(hotel, /<h2>Cốm, thỏ Hà Lan<\/h2>/);
  assert.match(hotel, /Lưu trú 08\/11 10:00 → 10\/11 12:00\. Chuồng C1</);
});

test("CheckInSummary: spa có 3 ô (khách, cân nặng khai báo, dịch vụ), không có số điện thoại hay tạm tính", () => {
  const html = render(h(CheckInSummary, { data: dataOf(MOCK_CHECK_IN_IDS.spaBong), weightLabel: "Cân nặng khai báo" }));
  assert.match(html, /Khách hàng/);
  assert.match(html, /Trần Minh Anh/);
  assert.match(html, /Cân nặng khai báo/);
  assert.match(html, /9,0 kg, nhóm Nhỏ/);
  assert.match(html, /Chiều cao 30 cm giữ theo hồ sơ/);
  assert.match(html, /Tắm &amp; sấy, Cắt tỉa/);
  assert.doesNotMatch(html, /Tạm tính/);
  const hotel = render(h(CheckInSummary, { data: dataOf(MOCK_CHECK_IN_IDS.hotelCom), weightLabel: "Cân nặng khai báo" }));
  assert.match(hotel, /Phạm Quốc Huy/);
  assert.doesNotMatch(hotel, /Cân nặng khai báo/);
});

test("CostConfirmationNotice: nhóm cũ → mới, số tiền, đồng hồ đếm ngược, không nêu số ngưỡng hay số phút", () => {
  const confirmation = {
    actualWeightKg: 11.2,
    newSizeGroup: "Medium",
    oldAmount: 270000,
    newAmount: 330000,
    status: "Pending",
    expiresAt: new Date(Date.now() + 29 * 60_000 + 30_000).toISOString(),
  };
  const html = render(h(CostConfirmationNotice, { confirmation, currentSizeGroup: "Small", declaredWeightKg: 9, onExpire() {} }));
  assert.match(html, /Tăng nhóm kích cỡ: Nhỏ → Vừa/);
  assert.match(html, /Chênh 2,2 kg, vượt ngưỡng dung sai\./);
  assert.match(html, /Chi phí tăng từ 270\.000đ lên <b[^>]*>330\.000đ<\/b>/);
  assert.match(html, /Đã gửi yêu cầu xác nhận cho khách/);
  assert.match(html, /role="timer"[^>]*aria-live="off"/);
  assert.match(html, />2[89]:\d\d<\/span>/);
  assert.match(html, /hồ sơ cập nhật 11,2 kg\. Khách từ chối hoặc quá hạn phản hồi, lịch tự động hủy\./);
  assert.doesNotMatch(html, /1,5 kg|30 phút/);
});

test("CostResponseDialog: mô tả chi phí mới/trước, 2 lựa chọn (mặc định đồng ý), nút Hủy bỏ và Ghi nhận phản hồi", () => {
  const confirmation = { actualWeightKg: 11.2, newSizeGroup: "Medium", oldAmount: 270000, newAmount: 330000, status: "Pending", expiresAt: "2026-11-08T03:00:00Z" };
  const html = render(h(CostResponseDialog, { petName: "Bông", appointmentCode: "LH-1029A001", confirmation, isSubmitting: false, error: null, onSubmit() {}, onClose() {} }));
  assert.match(html, /<dialog[^>]*aria-labelledby/);
  assert.match(html, /Ghi nhận phản hồi của khách/);
  assert.match(html, /Bông, LH-1029A001\. Chi phí mới 330\.000đ \(trước 270\.000đ\)\./);
  assert.match(html, /value="accept"[^>]*checked=""|checked=""[^>]*value="accept"/);
  assert.doesNotMatch(html, /value="reject"[^>]*checked=""|checked=""[^>]*value="reject"/);
  assert.match(html, /Khách đồng ý chi phí mới/);
  assert.match(html, /Lịch tiếp tục, hồ sơ cập nhật 11,2 kg/);
  assert.match(html, /Khách từ chối/);
  assert.match(html, /Lịch bị hủy, lý do không xác nhận chi phí mới/);
  assert.doesNotMatch(html, /Khách phản hồi qua/);
  assert.match(html, /data-initial-focus[^>]*>Hủy bỏ</);
  assert.match(html, />Ghi nhận phản hồi<\/button>/);
});

test("CostResponseDialog: đang gửi khóa nút, lỗi hiện ngay trong hộp thoại", () => {
  const confirmation = { actualWeightKg: 11.2, newSizeGroup: "Medium", oldAmount: 270000, newAmount: 330000, status: "Pending", expiresAt: "2026-11-08T03:00:00Z" };
  const html = render(h(CostResponseDialog, { petName: "Bông", appointmentCode: "LH-1029A001", confirmation, isSubmitting: true, error: new Error("x"), onSubmit() {}, onClose() {} }));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Đang gửi…/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Có lỗi xảy ra, vui lòng thử lại sau\./);
});

test("HotelWeightStep: bước 1 dạng nhập và dạng đã đối chiếu", () => {
  const form = render(h(HotelWeightStep, { mode: "form", registration: REGISTRATION, isSubmitting: false }));
  assert.match(form, /Bước 1 – Đối chiếu cân nặng/);
  assert.match(form, /<button type="submit"[^>]*>Đối chiếu cân nặng<\/button>/);
  const outcome = { weightCheck: { result: "OK" }, actualWeightKg: 1.45, declaredWeightKg: 1.4, previousSizeGroup: "Small" };
  const recorded = render(h(HotelWeightStep, { mode: "recorded", actualWeightKg: 1.45, outcome }));
  assert.match(recorded, /Ghi nhận cân nặng thực tế: 1,45 kg/);
  assert.match(recorded, /Khai báo 1,4 kg\. Chênh 0,05 kg\. Chi phí không đổi\./);
  assert.match(recorded, /Đã đối chiếu/);
  const reopened = render(h(HotelWeightStep, { mode: "recorded", actualWeightKg: 1.45, outcome: null }));
  assert.match(reopened, /Ghi nhận cân nặng thực tế: 1,45 kg/);
  assert.doesNotMatch(reopened, /Khai báo/);
});

test("WeightOutcomeNotice: tiêu đề và nội dung theo thông báo", () => {
  const html = render(h(WeightOutcomeNotice, { notice: { tone: "neutral", icon: "scale", title: "Cân nặng giảm, xuống nhóm Nhỏ", body: "Hồ sơ cập nhật 2,9 kg." } }));
  assert.match(html, /data-tone="neutral"/);
  assert.match(html, /Cân nặng giảm, xuống nhóm Nhỏ/);
  assert.match(html, /Hồ sơ cập nhật 2,9 kg\./);
});

