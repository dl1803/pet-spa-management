import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PetAvatar } from "../components/domain/pet-avatar.tsx";
import { Alert } from "../components/feedback/alert.tsx";
import { Icon } from "../components/icons.tsx";
import { Button, ButtonLink } from "../components/ui/button.tsx";
import { Tag } from "../components/ui/tag.tsx";

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
  for (const name of ["check", "lock", "scale", "camera", "image", "note", "play"]) {
    const html = render(React.createElement(Icon, { name }));
    assert.match(html, /<svg[^>]*aria-hidden="true"/, name);
    assert.match(html, /<(path|rect|circle)\b/, name);
  }
});
