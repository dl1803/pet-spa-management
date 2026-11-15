import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HotelPricingGate } from "../features/cages/components/hotel-pricing-gate.tsx";
import { ApiError } from "../lib/api/errors.ts";

const noop = () => {};
const content = React.createElement("span", null, "FORM-GIA");
const render = (props) =>
  renderToStaticMarkup(
    React.createElement(HotelPricingGate, { hasData: false, isPending: false, error: null, onRetry: noop, ...props }, content),
  );

test("HotelPricingGate: đang tải thì hiện thông báo trạng thái, không hiện form", () => {
  const html = render({ isPending: true });
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.ok(html.includes("Đang tải bảng giá…"));
  assert.ok(!html.includes("FORM-GIA"));
});

test("HotelPricingGate: đã có dữ liệu thì hiện form, kể cả khi lần tải lại nền báo lỗi", () => {
  const loaded = render({ hasData: true });
  assert.ok(loaded.includes("FORM-GIA"));
  assert.ok(!loaded.includes("Đang tải") && !loaded.includes("Thử lại"));

  const refetchFailed = render({ hasData: true, error: new ApiError({ kind: "http", status: 500 }) });
  assert.ok(refetchFailed.includes("FORM-GIA"));
  assert.ok(!refetchFailed.includes('role="alert"') && !refetchFailed.includes("Thử lại"));
});

test("HotelPricingGate: 403 hiện ForbiddenState, không có nút Thử lại, không hiện form", () => {
  const html = render({ error: new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" }) });
  assert.ok(html.includes("Bạn không có quyền xem trang này"));
  assert.ok(!html.includes("Thử lại"));
  assert.ok(!html.includes("FORM-GIA"));
});

test("HotelPricingGate: lỗi khác hiện cảnh báo chung (không lộ chi tiết nội bộ), nút Thử lại, không hiện form", () => {
  const server = render({ error: new ApiError({ kind: "http", status: 500, detail: "private database error" }) });
  assert.match(server, /role="alert"/);
  assert.ok(server.includes("Có lỗi xảy ra, vui lòng thử lại sau."));
  assert.ok(!server.includes("private database error"));
  assert.ok(server.includes("Thử lại"));
  assert.ok(!server.includes("FORM-GIA"));

  const network = render({ error: new ApiError({ kind: "network" }) });
  assert.ok(network.includes("Không kết nối được máy chủ, vui lòng thử lại."));
  assert.ok(network.includes("Thử lại"));
});
