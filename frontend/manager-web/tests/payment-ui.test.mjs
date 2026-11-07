import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentBadge } from "../components/domain/payment-badge.tsx";
import { KpiTile } from "../components/ui/kpi-tile.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { Pager } from "../components/ui/pager.tsx";

const noop = () => {};
const render = (component, props, ...children) => renderToStaticMarkup(React.createElement(component, props, ...children));

test("PaymentBadge: chưa thanh toán dùng tông pay-0, đã thanh toán dùng pay-1 và đúng nhãn", () => {
  const unpaid = render(PaymentBadge, { status: "Unpaid" });
  const paid = render(PaymentBadge, { status: "Paid" });
  assert.ok(unpaid.includes("Chưa thanh toán") && unpaid.includes("bg-st-pending-bg"));
  assert.ok(paid.includes("Đã thanh toán") && paid.includes("bg-success-50"));
});

test("KpiTile: nhãn, số lớn, chú thích; accent dùng nền Apricot", () => {
  const html = render(KpiTile, { icon: "hourglass", label: "Chưa thanh toán", value: "2", caption: "690.000đ", accent: true });
  assert.ok(html.includes("Chưa thanh toán") && html.includes(">2<") && html.includes("690.000đ"));
  assert.ok(html.includes("bg-apricot-50"));
  assert.ok(!render(KpiTile, { icon: "hourglass", label: "A", value: "1", caption: "B" }).includes("bg-apricot-50"));
});

test("Pager: ẩn khi chỉ có một trang; trang hiện tại có aria-current; className mặc định mt-5 và có thể bỏ", () => {
  assert.equal(render(Pager, { page: 1, pageSize: 20, total: 20, onPageChange: noop }), "");
  const html = render(Pager, { page: 2, pageSize: 20, total: 24, onPageChange: noop });
  assert.match(html, /aria-current="page"[^>]*>2</);
  assert.ok(html.includes("mt-5"));
  assert.ok(!render(Pager, { page: 2, pageSize: 20, total: 24, onPageChange: noop, className: "" }).includes("mt-5"));
});

test("Modal: tiêu đề, mô tả, nội dung; dialog có aria-labelledby trỏ tới tiêu đề", () => {
  const html = render(Modal, { icon: "wallet", title: "Tiêu đề", description: "Mô tả", onClose: noop }, React.createElement("p", null, "Nội dung"));
  assert.match(html, /<dialog[^>]*aria-labelledby="([^"]+)"/);
  const id = html.match(/aria-labelledby="([^"]+)"/)[1];
  assert.ok(html.includes(`id="${id}"`));
  assert.ok(html.includes("Tiêu đề") && html.includes("Mô tả") && html.includes("bg-lagoon-50"));
});
