import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Alert } from "../components/feedback/alert.tsx";

const render = (props, children = "Nội dung") => renderToStaticMarkup(React.createElement(Alert, props, children));

test("danger giữ nguyên: role alert, biểu tượng x-circle mặc định, không có tiêu đề", () => {
  const html = render({ tone: "danger" });
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('data-tone="danger"'));
  assert.ok(html.includes("border-[#EFC3BE]") && html.includes("bg-danger-50") && html.includes("text-danger"));
  assert.ok(html.includes("m15 9-6 6M9 9l6 6"));
  assert.ok(!html.includes("font-semibold"));
});

test("info: nền info, không có role alert, dùng biểu tượng được truyền vào, có tiêu đề", () => {
  const html = render({ tone: "info", icon: "calendar", title: "Tiêu đề" });
  assert.ok(html.includes('data-tone="info"'));
  assert.ok(!html.includes('role="alert"'));
  assert.ok(html.includes("border-[#C7DAF1]") && html.includes("bg-info-50") && html.includes("text-info"));
  assert.ok(html.includes('<div class="font-semibold">Tiêu đề</div>'));
  assert.ok(!html.includes("m15 9-6 6M9 9l6 6"));
});

test("warn: nền cam nhạt, không có role alert", () => {
  const html = render({ tone: "warn", icon: "users" });
  assert.ok(html.includes('data-tone="warn"'));
  assert.ok(!html.includes('role="alert"'));
  assert.ok(html.includes("border-[#F1D9A2]") && html.includes("bg-[#FFF6E3]") && html.includes("text-[#B87400]"));
});

test("info và warn dùng biểu tượng mặc định khi không truyền icon", () => {
  assert.ok(render({ tone: "info" }).includes("M12 16v-4M12 8h.01"));
  assert.ok(render({ tone: "warn" }).includes("M12 9v4M12 17h.01"));
});
