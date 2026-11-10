import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentBadge } from "../components/domain/payment-badge.tsx";
import { PetAvatar } from "../components/domain/pet-avatar.tsx";
import { Alert } from "../components/feedback/alert.tsx";
import { Icon } from "../components/icons.tsx";
import { Button, ButtonLink } from "../components/ui/button.tsx";
import { Field } from "../components/ui/field.tsx";
import { Input, Textarea } from "../components/ui/input.tsx";
import { SegmentedControl } from "../components/ui/segmented-control.tsx";
import { Tag } from "../components/ui/tag.tsx";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "../lib/labels.ts";
import { STORE_BANK } from "../lib/store-info.ts";

const render = (element) => renderToStaticMarkup(element);

test("Button mặc định giữ nguyên: primary, cỡ md, type=button, không chiếm hết bề ngang", () => {
  const html = render(React.createElement(Button, null, "Lưu"));
  assert.match(html, /^<button type="button"/);
  assert.match(html, /bg-lagoon text-white/);
  assert.match(html, /min-h-11 px-4 text-sm/);
  assert.doesNotMatch(html, /w-full/);
  assert.doesNotMatch(html, /\sdisabled=""/);
});

test("Button: cỡ lg, block, vô hiệu hóa có kiểu nền xám và hover chỉ áp dụng khi bật", () => {
  const html = render(React.createElement(Button, { size: "lg", block: true, disabled: true }, "Bắt đầu"));
  assert.match(html, /min-h-12 px-\[22px\] text-\[15px\]/);
  assert.match(html, /w-full/);
  assert.match(html, /\sdisabled=""/);
  assert.match(html, /disabled:bg-\[#E5ECEE\]/);
  assert.match(html, /disabled:text-\[#869AA0\]/);
  assert.match(html, /not-disabled:hover:bg-lagoon-700/);
  assert.doesNotMatch(html, /[\s"]hover:bg-lagoon-700/);
  assert.doesNotMatch(html, /enabled:hover/);
});

test("Button: loading hỗ trợ loadingText tùy biến hoặc mặc định Đang gửi…", () => {
  const custom = render(React.createElement(Button, { loading: true, loadingText: "Đang lưu…" }, "Lưu"));
  assert.match(custom, /Đang lưu…/);
  assert.doesNotMatch(custom, /Đang gửi…/);

  const def = render(React.createElement(Button, { loading: true }, "Lưu"));
  assert.match(def, /Đang gửi…/);
});

test("ButtonLink: block thêm w-full, mặc định không thêm", () => {
  assert.match(render(React.createElement(ButtonLink, { href: "/x", block: true }, "Đi")), /w-full/);
  assert.doesNotMatch(render(React.createElement(ButtonLink, { href: "/x" }, "Đi")), /w-full/);
  const link = render(React.createElement(ButtonLink, { href: "/x" }, "Đi"));
  assert.match(link, /not-disabled:hover:bg-lagoon-700/);
  assert.doesNotMatch(link, /enabled:hover/);
});

test("Tag: hai tông lock và ok, luôn có chữ", () => {
  const lock = render(React.createElement(Tag, { tone: "lock" }, "Chưa hợp lệ"));
  const ok = render(React.createElement(Tag, { tone: "ok" }, "Hợp lệ"));
  assert.match(lock, /bg-danger-50 text-danger[^>]*>Chưa hợp lệ<\/span>/);
  assert.match(ok, /bg-success-50 text-success[^>]*>Hợp lệ<\/span>/);
});

test("Alert: tông warn và neutral, icon ẩn với trình đọc màn hình, nội dung giữ nguyên", () => {
  const warn = render(React.createElement(Alert, { tone: "warn", icon: "scale" }, "Cảnh báo"));
  const neutral = render(React.createElement(Alert, { tone: "neutral", icon: "note" }, "Ghi chú"));
  assert.match(warn, /data-tone="warn"/);
  assert.match(warn, /border-\[#F1D9A2\] bg-\[#FFF6E3\]/);
  assert.match(warn, /aria-hidden="true"/);
  assert.match(warn, />Cảnh báo<\/div>/);
  assert.match(neutral, /data-tone="neutral"/);
  assert.match(neutral, /border-line bg-mist/);
});

test("PetAvatar: thêm cỡ xl 96px, cỡ cũ không đổi", () => {
  assert.match(render(React.createElement(PetAvatar, { species: "Dog", size: "xl" })), /size-24 rounded-\[28px\]/);
  assert.match(render(React.createElement(PetAvatar, { species: "Dog" })), /size-11 rounded-\[14px\]/);
  assert.match(render(React.createElement(PetAvatar, { species: "Cat", size: "sm" })), /size-\[34px\]/);
});

test("icon mới đều vẽ được", () => {
  for (const name of ["check", "lock", "scale", "camera", "image", "note", "play", "search", "mail"]) {
    const html = render(React.createElement(Icon, { name }));
    assert.match(html, /<svg[^>]*aria-hidden="true"/, name);
    assert.match(html, /<(path|rect|circle)\b/, name);
  }
});

test("Input: không có biểu tượng hay đơn vị thì chỉ là một thẻ input cao 44px như cũ", () => {
  const html = render(React.createElement(Input, { id: "x" }));
  assert.match(html, /^<input class="h-11 w-full rounded-\[10px\]/);
  assert.doesNotMatch(html, /pl-\[38px\]|pr-11|relative/);
});

test("Input: prefixIcon chừa chỗ cho biểu tượng, suffix hiện đơn vị và ẩn với trình đọc màn hình", () => {
  const withIcon = render(React.createElement(Input, { id: "x", prefixIcon: "search" }));
  assert.match(withIcon, /^<div class="relative">/);
  assert.match(withIcon, /<svg[^>]*aria-hidden="true"/);
  assert.match(withIcon, /pl-\[38px\]/);

  const withSuffix = render(React.createElement(Input, { id: "x", suffix: "kg" }));
  assert.match(withSuffix, /pr-11/);
  assert.match(withSuffix, /<span aria-hidden="true"[^>]*>kg<\/span>/);
});

test("Textarea: cao tối thiểu 84px, kéo giãn theo chiều dọc", () => {
  const html = render(React.createElement(Textarea, { rows: 3 }));
  assert.match(html, /^<textarea class="min-h-\[84px\] resize-y py-2\.5 leading-5 w-full/);
});

test("Field: optional và note thêm chú thích sau nhãn, mặc định không thêm", () => {
  const renderField = (props) =>
    render(React.createElement(Field, { id: "f", label: "Ghi chú", ...props }, (control) => React.createElement("input", control)));
  assert.match(renderField({ optional: true }), /Ghi chú<span class="font-normal text-muted"> \(không bắt buộc\)<\/span>/);
  assert.match(renderField({ note: "chỉ cần với chó" }), /<span class="font-normal text-muted"> \(chỉ cần với chó\)<\/span>/);
  const plain = renderField({ required: true });
  assert.doesNotMatch(plain, /font-normal text-muted/);
  assert.match(plain, /aria-required="true"/);
});

test("icon tiền mặt và mã QR vẽ được", () => {
  for (const name of ["cash", "qr"]) {
    const html = render(React.createElement(Icon, { name }));
    assert.match(html, /<svg[^>]*aria-hidden=\"true\"/, name);
    assert.match(html, /<(path|rect|circle)\b/, name);
  }
});

test("PaymentBadge: chưa thanh toán tông vàng, đã thanh toán tông xanh, luôn kèm chữ", () => {
  const unpaid = render(React.createElement(PaymentBadge, { status: "Unpaid" }));
  const paid = render(React.createElement(PaymentBadge, { status: "Paid" }));
  assert.match(unpaid, /bg-st-pending-bg text-st-pending/);
  assert.match(unpaid, /Chưa thanh toán<\/span>/);
  assert.match(paid, /bg-success-50 text-success/);
  assert.match(paid, /Đã thanh toán<\/span>/);
});

test("SegmentedControl: nút đang chọn có aria-pressed, mỗi nút cao tối thiểu 44px", () => {
  const html = render(
    React.createElement(SegmentedControl, {
      label: "Phương thức",
      value: "BankQR",
      onChange: () => {},
      items: [
        { value: "Cash", label: "Tiền mặt" },
        { value: "BankQR", label: "Chuyển khoản QR" },
      ],
    }),
  );
  assert.match(html, /role=\"group\" aria-label=\"Phương thức\"/);
  assert.match(html, /aria-pressed=\"false\"[^>]*>Tiền mặt<\/button>/);
  assert.match(html, /aria-pressed=\"true\"[^>]*>Chuyển khoản QR<\/button>/);
  assert.equal(html.match(/min-h-11/g)?.length, 2);
});

test("nhãn thanh toán và thông tin ngân hàng cửa hàng", () => {
  assert.deepEqual(PAYMENT_KIND_LABELS, { Spa: "Khoản spa", Stay: "Tiền lưu trú", LateFee: "Phí trả muộn" });
  assert.deepEqual(PAYMENT_STATUS_LABELS, { Unpaid: "Chưa thanh toán", Paid: "Đã thanh toán" });
  assert.deepEqual(PAYMENT_METHOD_LABELS, { Cash: "Tiền mặt", BankQR: "Chuyển khoản QR", Online: "Trực tuyến" });
  assert.equal(STORE_BANK.bankName, "Vietcombank");
  assert.equal(STORE_BANK.accountNumber, "0071 0006 86868");
});

