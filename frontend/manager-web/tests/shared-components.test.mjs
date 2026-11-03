import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "../components/ui/avatar.tsx";
import { ChoiceCard } from "../components/ui/choice-card.tsx";
import { Drawer } from "../components/ui/drawer.tsx";
import { FilterChip } from "../components/ui/filter-chip.tsx";
import { formatPhone } from "../lib/format.ts";
import { STAFF_ROLE_LABELS } from "../lib/labels.ts";
import { withQuery } from "../lib/routes.ts";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;

test("formatPhone nhóm 4-3-3 cho số 10 chữ số, giữ nguyên giá trị khác", () => {
  assert.equal(formatPhone("0903412678"), "0903 412 678");
  assert.equal(formatPhone("abc"), "abc");
  assert.equal(formatPhone("090341267"), "090341267");
});

test("withQuery bỏ giá trị rỗng và dựng chuỗi truy vấn", () => {
  assert.equal(withQuery("/nhan-vien", { filter: null }), "/nhan-vien");
  assert.equal(withQuery("/nhan-vien", { filter: undefined, page: "" }), "/nhan-vien");
  assert.equal(withQuery("/nhan-vien", { filter: "spa" }), "/nhan-vien?filter=spa");
});

test("nhãn vai trò nhân viên", () => {
  assert.deepEqual(STAFF_ROLE_LABELS, { Receptionist: "Lễ tân", SpaStaff: "Nhân viên spa" });
});

test("avatar có thêm tông apricot cho lễ tân bên cạnh teal", () => {
  const apricot = renderToStaticMarkup(React.createElement(Avatar, { name: "Phạm Thu Hà", tone: "apricot" }));
  const teal = renderToStaticMarkup(React.createElement(Avatar, { name: "Lê Minh Tâm", tone: "teal" }));
  assert.ok(apricot.includes("bg-apricot-100 text-apricot-700") && apricot.includes(">PH<"));
  assert.ok(teal.includes("bg-lagoon-50 text-lagoon-700") && teal.includes(">LT<"));
});

test("chip lọc có số, trạng thái bật được báo bằng aria-pressed", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      "div",
      null,
      React.createElement(FilterChip, { active: true, count: 6, onClick: noop }, "Tất cả"),
      React.createElement(FilterChip, { active: false, count: 4, onClick: noop }, "Nhân viên spa"),
      React.createElement(FilterChip, { active: false, onClick: noop }, "Không số"),
    ),
  );
  assert.equal(count(html, /aria-pressed="true"/g), 1);
  assert.equal(count(html, /aria-pressed="false"/g), 2);
  assert.match(html, /Tất cả[\s\S]*?>6</);
  assert.match(html, /Nhân viên spa[\s\S]*?>4</);
  assert.ok(!/Không số[\s\S]*?<span/.test(html));
});

test("thẻ chọn dùng radio thật ẩn bên trong và đánh dấu thẻ đang chọn", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      "div",
      null,
      React.createElement(ChoiceCard, { name: "r", value: "a", checked: true, onChange: noop }, "A"),
      React.createElement(ChoiceCard, { name: "r", value: "b", checked: false, onChange: noop }, "B"),
    ),
  );
  assert.equal(count(html, /type="radio"/g), 2);
  assert.equal(count(html, /type="radio"[^>]*checked=""/g), 1);
  assert.equal(count(html, /sr-only/g), 2);
});

test("ngăn kéo: mặc định rộng 640px, form ngắn rộng 520px", () => {
  const wide = renderToStaticMarkup(React.createElement(Drawer, { title: "A", onClose: noop }, "x"));
  const narrow = renderToStaticMarkup(React.createElement(Drawer, { title: "A", size: "narrow", onClose: noop }, "x"));
  assert.ok(wide.includes("w-[640px]") && !wide.includes("w-[520px]"));
  assert.ok(narrow.includes("w-[520px]") && !narrow.includes("w-[640px]"));
});
