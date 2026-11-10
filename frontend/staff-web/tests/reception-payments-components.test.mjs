import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { CashPanel } from "../features/reception-payments/components/cash-panel.tsx";
import { CounterPaymentForm } from "../features/reception-payments/components/counter-payment-form.tsx";
import { PaymentTicket } from "../features/reception-payments/components/payment-ticket.tsx";
import { PaymentsWorkspace } from "../features/reception-payments/components/payments-workspace.tsx";
import { QrPanel } from "../features/reception-payments/components/qr-panel.tsx";
import { createCounterFormValues, getCounterFormState } from "../features/reception-payments/forms.ts";
import { createMockPaymentRows, MOCK_CONFIRMER_NAME } from "../features/reception-payments/mock-data.ts";
import { ApiError } from "../lib/api/errors.ts";

// 10:00 ngày 11/11/2026 theo giờ cửa hàng.
const NOW = new Date("2026-11-11T03:00:00Z");
const TODAY = "2026-11-11";
const [stay, secondStay, lateFee, spa] = createMockPaymentRows(NOW);
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const registration = (name) => ({ name, onChange: async () => {}, onBlur: async () => {}, ref: () => {} });

function renderWorkspace(rows, appointmentId = null) {
  const client = new QueryClient();
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(PaymentsWorkspace, { data: { rows, confirmerName: MOCK_CONFIRMER_NAME }, appointmentId, todayKey: TODAY }),
      ),
    ),
  );
}

test("phiếu rút gọn: cuống có số tiền và loại khoản, có tên thú cưng, mô tả và trạng thái chọn", () => {
  const html = renderToStaticMarkup(
    React.createElement(PaymentTicket, { row: stay, description: "Tiền lưu trú, nhận 10:00 hôm nay", selected: true, onSelect: () => {} }),
  );
  assert.match(html, /^<button type="button" aria-pressed="true"/);
  assert.match(html, />250\.000đ<\/span>/);
  assert.match(html, />Lưu trú<\/span>/);
  assert.match(html, />Cốm<\/span>/);
  assert.match(html, />Tiền lưu trú, nhận 10:00 hôm nay<\/span>/);
  assert.match(html, /border-lagoon ring-1 ring-lagoon/);

  const idle = renderToStaticMarkup(
    React.createElement(PaymentTicket, { row: lateFee, description: "Phí trả muộn, LH-A2800003", selected: false, onSelect: () => {} }),
  );
  assert.match(idle, /aria-pressed="false"/);
  assert.match(idle, />Phí trễ<\/span>/);
  assert.doesNotMatch(idle, /ring-lagoon/);
});

test("tiền mặt: nhận đủ hiện Tiền thối lại; thiếu tiền đổi thành Còn thiếu chữ đỏ kèm lỗi dưới ô", () => {
  const render = (receivedAmount, error) => {
    const state = getCounterFormState({ ...createCounterFormValues(250000), receivedAmount }, 250000);
    return renderToStaticMarkup(
      React.createElement(CashPanel, { id: "received", registration: registration("receivedAmount"), error, state }),
    );
  };
  const enough = render("300.000");
  assert.match(enough, /Số tiền khách đưa/);
  assert.match(enough, />Tiền thối lại<\/div>/);
  assert.match(enough, /text-ink[^>]*>50\.000đ<\/div>/);
  assert.doesNotMatch(enough, /Còn thiếu/);

  assert.match(render(""), /aria-live="polite"[^>]*>—<\/div>/);
  assert.match(render("abc"), /aria-live="polite"[^>]*>—<\/div>/);
  assert.match(render("250.000"), /aria-live="polite"[^>]*>0đ<\/div>/);

  const short = render("200.000", "Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.");
  assert.match(short, />Còn thiếu<\/div>/);
  assert.match(short, /text-danger[^>]*>50\.000đ<\/div>/);
  assert.doesNotMatch(short, /Tiền thối lại/);
  assert.match(short, /aria-invalid="true"/);
  assert.match(short, /Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán\./);
});

test("chuyển khoản QR: hình QR minh họa, ngân hàng, số tài khoản, nội dung, số tiền đã nhận và ô kiểm tra", () => {
  const html = renderToStaticMarkup(
    React.createElement(QrPanel, {
      appointmentId: stay.appointment.appointmentId,
      receivedId: "received",
      confirmId: "confirm",
      receivedRegistration: registration("receivedAmount"),
      confirmRegistration: registration("bankConfirmed"),
    }),
  );
  assert.match(html, /role="img" aria-label="Mã QR chuyển khoản \(hình minh họa\)"/);
  assert.match(html, />Vietcombank<\/dd>/);
  assert.match(html, />0071 0006 86868<\/dd>/);
  assert.match(html, />LHA2800001<\/dd>/);
  assert.match(html, /Số tiền đã nhận/);
  assert.match(html, /<input id="confirm" type="checkbox"/);
  assert.match(html, /Đã kiểm tra tiền vào tài khoản cửa hàng/);
});

test("form: khoản tiền lưu trú hiện đủ các vùng, mặc định tiền mặt và nút xác nhận mở", () => {
  const html = renderToStaticMarkup(
    React.createElement(CounterPaymentForm, { row: stay, confirmerName: "Thu Hà", isSubmitting: false, onSubmit: () => {} }),
  );
  assert.match(html, /<h2>Cốm: tiền lưu trú<\/h2>/);
  assert.match(html, />LH-A2800001\. Phạm Quốc Huy<\/p>/);
  assert.match(html, /Chưa thanh toán<\/span>/);
  assert.match(html, /Đã xác nhận, chờ tiếp nhận/);
  assert.match(html, /Thỏ, nhóm Nhỏ \(đã đối chiếu 1,45 kg\)/);
  assert.match(html, /2 đêm × \(100\.000đ \+ 25\.000đ\)/);
  assert.match(html, />250\.000đ<\/span>/);
  assert.match(html, /aria-pressed="true"[^>]*>[\s\S]*?Tiền mặt<\/button>/);
  assert.match(html, /aria-pressed="false"[^>]*>[\s\S]*?Chuyển khoản QR<\/button>/);
  assert.match(html, /Số tiền khách đưa/);
  assert.match(html, /Người xác nhận: Thu Hà/);
  const submit = html.match(/<button type="submit"[^>]*>Xác nhận đã thanh toán<\/button>/)?.[0] ?? "";
  assert.notEqual(submit, "");
  assert.doesNotMatch(submit, /\sdisabled=""/);
  assert.doesNotMatch(html, /name="amount"/);
});

test("form: lỗi ghi nhận số tiền hiện dưới ô, lỗi thao tác hiện bằng cảnh báo", () => {
  const render = (error, receivedAmount = stay.payment.amount) => renderToStaticMarkup(
    React.createElement(CounterPaymentForm, {
      row: stay,
      confirmerName: "Thu Hà",
      isSubmitting: false,
      submissionFailure: { error, receivedAmount },
      onSubmit: () => {},
    }),
  );
  const mismatch = new ApiError({ kind: "http", status: 409, code: "AMOUNT_MISMATCH" });
  const fieldError = render(mismatch);
  assert.match(fieldError, /<input[^>]*aria-invalid="true"[^>]*name="receivedAmount"/);
  assert.match(fieldError, /Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán\./);
  assert.doesNotMatch(fieldError, /role="alert"/);

  const editedAmount = render(mismatch, 300000);
  assert.match(editedAmount, /role="alert"/);
  assert.doesNotMatch(editedAmount, /aria-invalid="true"/);

  const notDue = new ApiError({ kind: "http", status: 409, code: "PAYMENT_NOT_DUE", detail: "Khoản này chưa đến thời điểm thu." });
  assert.match(render(notDue), /role="alert"[\s\S]*Khoản này chưa đến thời điểm thu\./);
  assert.match(render(new ApiError({ kind: "network" })), /role="alert"[\s\S]*Không kết nối được máy chủ/);
  assert.match(render(new ApiError({ kind: "http", status: 500, detail: "Internal detail" })), /role="alert"[\s\S]*Có lỗi xảy ra, vui lòng thử lại sau/);
});

test("form: đang gửi thì nút xác nhận khóa và hiện Đang ghi nhận…", () => {
  const html = renderToStaticMarkup(
    React.createElement(CounterPaymentForm, { row: spa, confirmerName: "Thu Hà", isSubmitting: true, onSubmit: () => {} }),
  );
  assert.match(html, /<button type="submit" disabled=""[^>]*aria-busy="true"/);
  assert.match(html, /Đang ghi nhận…/);
  assert.match(html, /Tắm và sấy/);
  assert.match(html, />270\.000đ<\/span>/);
});

test("form: phí trả muộn hiện trả dự kiến, trả thực tế kèm số phút trễ", () => {
  const html = renderToStaticMarkup(
    React.createElement(CounterPaymentForm, { row: lateFee, confirmerName: "Thu Hà", isSubmitting: false, onSubmit: () => {} }),
  );
  assert.match(html, /<h2>Mướp: phí trả muộn<\/h2>/);
  assert.match(html, /Trả dự kiến/);
  assert.match(html, /T4 11\/11, 11:40 \(trễ 100 phút\)/);
  assert.match(html, />100\.000đ<\/span>/);
});

test("màn: danh sách bốn khoản, khoản đầu được chọn sẵn", () => {
  const html = renderWorkspace([stay, secondStay, lateFee, spa]);
  assert.match(html, /Khoản cần thu/);
  assert.match(html, />4 khoản<\/span>/);
  assert.equal(count(html, /<button type="button" aria-pressed=/g), 4 + 2);
  assert.match(html, /<h2>Cốm: tiền lưu trú<\/h2>/);
  assert.match(html, /Tiền lưu trú, nhận 08:00 ngày 10\/11/);
  assert.match(html, /Lịch spa đã hoàn tất, LH-A2800004/);
});

test("màn: ?appointmentId= chọn sẵn khoản của lịch đó; không khớp thì chọn khoản đầu", () => {
  assert.match(renderWorkspace([stay, secondStay, lateFee, spa], lateFee.appointment.appointmentId), /<h2>Mướp: phí trả muộn<\/h2>/);
  assert.match(renderWorkspace([stay, secondStay, lateFee, spa], "khong-co"), /<h2>Cốm: tiền lưu trú<\/h2>/);
});

test("màn: không có khoản nào thì hiện Không có khoản cần thu.", () => {
  const html = renderWorkspace([]);
  assert.match(html, /Không có khoản cần thu\./);
  assert.doesNotMatch(html, /Xác nhận đã thanh toán/);
});
