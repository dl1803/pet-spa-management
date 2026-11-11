import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KpiTile } from "../components/ui/kpi-tile.tsx";
import { Tag } from "../components/ui/tag.tsx";
import { CageForm } from "../features/cages/components/cage-form.tsx";
import { CageStats } from "../features/cages/components/cage-stats.tsx";
import { CageTable } from "../features/cages/components/cage-table.tsx";
import { MOCK_CAGES } from "../features/cages/mock-data.ts";

const NOW = "2026-10-06T09:20:00+07:00";
const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const tableProps = { cages: MOCK_CAGES, now: NOW, onAdd: noop, onEdit: noop, onStop: noop, onReopen: noop };
const formProps = { onSubmit: noop, onClose: noop, fallbackFocusRef: { current: null } };
const cage = (code) => MOCK_CAGES.find((item) => item.code === code);

test("Tag có tông busy cho chuồng đang chứa, các tông cũ không đổi", () => {
  assert.ok(render(Tag, { tone: "busy", children: "Đang chứa" }).includes("bg-st-active-bg"));
  assert.ok(render(Tag, { tone: "ok", children: "Trống" }).includes("bg-success-50"));
  assert.ok(render(Tag, { tone: "default", children: "Ngừng" }).includes("bg-line-soft"));
});

test("KpiTile: không có icon thì không vẽ biểu tượng; có icon vẫn vẽ như cũ", () => {
  const plain = render(KpiTile, { label: "Trống", value: "8", caption: "sẵn sàng nhận" });
  assert.ok(plain.includes("Trống") && plain.includes(">8<") && plain.includes("sẵn sàng nhận"));
  assert.equal(count(plain, /<svg/g), 0);
  assert.equal(count(render(KpiTile, { icon: "grid", label: "Trống", value: "8", caption: "x" }), /<svg/g), 1);
});

test("CageStats: 4 thẻ theo UI demo, không có biểu tượng", () => {
  const html = render(CageStats, { cages: MOCK_CAGES });
  assert.ok(html.indexOf("Sức chứa") < html.indexOf("Đang chứa") && html.indexOf("Đang chứa") < html.indexOf("Trống") && html.indexOf("Trống") < html.indexOf("Ngừng sử dụng"));
  for (const text of [">11<", "chuồng đang sử dụng", ">3<", "A2, B1, D2", ">8<", "sẵn sàng nhận", ">1<", "không tính vào sức chứa"]) assert.ok(html.includes(text), text);
  assert.equal(count(html, /<svg/g), 0);
});

test("CageStats: chưa có chuồng nào đang chứa thì caption báo rõ", () => {
  const html = render(CageStats, { cages: MOCK_CAGES.map((item) => ({ ...item, occupant: null })) });
  assert.ok(html.includes(">0<") && html.includes("chưa có chuồng nào"));
  assert.ok(!html.includes("A2, B1, D2"));
});

test("CageTable: 12 dòng, 6 cột, nhãn tình trạng đúng số lượng", () => {
  const html = render(CageTable, tableProps);
  assert.equal(count(html, /<tr\b/g), 13);
  assert.equal(count(html, /<th /g), 6);
  for (const text of ["Mã", "Loài", "Nhóm", "Tình trạng", "Đang chứa", "Thao tác"]) assert.ok(html.includes(`>${text}</th>`), text);
  assert.equal(count(html, />Trống<\/span>/g), 8);
  assert.equal(count(html, />Đang chứa<\/span>/g), 3);
  assert.equal(count(html, />Ngừng sử dụng<\/span>/g), 1);
  assert.ok(html.includes("<caption"));
  assert.ok(html.indexOf("A1") < html.indexOf("B1") && html.indexOf("B1") < html.indexOf("D2"));
});

test("CageTable: chuồng đang chứa hiện thú cưng, chủ và hạn trả; chuồng trống hiện “–”", () => {
  const html = render(CageTable, tableProps);
  for (const text of ["Bơ", "Chủ: Trương Hoài Nam. Trả 17:00 07/10", "Tuyết", "Chủ: Nguyễn Hải Yến. Trả 18:00 hôm nay", "Kem", "Chủ: Lý Thảo. Trả 10:00 09/10"]) assert.ok(html.includes(text), text);
  assert.equal(count(html, />–<\/span>/g), 9);
  assert.ok(html.includes("Chuột lang") && html.includes("Chó") && html.includes("Mèo") && html.includes("Thỏ"));
});

test("CageTable: nút theo tình trạng; chuồng đang chứa chỉ có Sửa, chuồng ngừng sử dụng có Mở lại", () => {
  const html = render(CageTable, tableProps);
  assert.equal(count(html, /aria-label="Sửa chuồng /g), 12);
  assert.equal(count(html, /aria-label="Ngừng sử dụng chuồng /g), 8);
  assert.equal(count(html, /aria-label="Mở lại chuồng /g), 1);
  assert.ok(html.includes('aria-label="Mở lại chuồng A4"') && html.includes('aria-label="Ngừng sử dụng chuồng A1"'));
  for (const code of ["A2", "B1", "D2", "A4"]) assert.ok(!html.includes(`aria-label="Ngừng sử dụng chuồng ${code}"`), code);
  assert.equal(count(html, /opacity-70/g), 1);
});

test("CageTable: danh sách rỗng hiện trạng thái rỗng có nút Thêm chuồng, không có bảng", () => {
  const html = render(CageTable, { ...tableProps, cages: [] });
  assert.ok(html.includes("Chưa có chuồng nào") && html.includes("Thêm chuồng đầu tiên để cửa hàng nhận lịch lưu trú."));
  assert.ok(html.includes(">Thêm chuồng</button>"));
  assert.ok(!html.includes("<table"));
});

test("CageForm thêm: tiêu đề, mô tả, 3 ô bắt buộc, loài và nhóm chưa chọn, nút Hủy bỏ và Lưu chuồng", () => {
  const html = render(CageForm, formProps);
  assert.ok(html.includes("Thêm chuồng") && html.includes("Chuồng mới tính ngay vào sức chứa lưu trú."));
  for (const text of ["Mã chuồng", "Loài", "Nhóm kích cỡ"]) assert.ok(html.includes(text), text);
  assert.equal(count(html, /aria-required="true"/g), 3);
  assert.ok(html.includes("Chọn loài") && html.includes("Chọn nhóm kích cỡ"));
  assert.equal(count(html, /<option value="" disabled/g), 2);
  assert.ok(html.indexOf("Chó") < html.indexOf("Mèo") && html.indexOf("Mèo") < html.indexOf("Thỏ") && html.indexOf("Thỏ") < html.indexOf("Chuột lang"));
  assert.equal(count(html, /<option value="(Small|Medium|Large)"/g), 3, "chưa chọn loài thì hiện đủ 3 nhóm");
  assert.ok(html.indexOf("Hủy bỏ") < html.indexOf("Lưu chuồng"));
  assert.ok(html.includes("data-initial-focus") && /<button[^>]*type="submit"/.test(html));
  assert.ok(!html.includes('role="alert"') && !html.includes("Sửa chuồng"));
  assert.match(html, /<dialog\b[^>]*aria-labelledby=/);
});

test("CageForm sửa: tiêu đề Sửa chuồng; chuột lang chỉ còn 2 nhóm Nhỏ, Lớn", () => {
  const edit = render(CageForm, { ...formProps, cage: cage("A2") });
  assert.ok(edit.includes("Sửa chuồng") && edit.includes("Cập nhật mã, loài hoặc nhóm kích cỡ của chuồng.") && edit.includes("Lưu chuồng"));
  assert.ok(!edit.includes("Chuồng mới tính ngay"));
  const guinea = render(CageForm, { ...formProps, cage: cage("D2") });
  assert.equal(count(guinea, /<option value="(Small|Medium|Large)"/g), 2);
  assert.ok(!guinea.includes('<option value="Medium"'));
  assert.equal(count(edit, /<option value="(Small|Medium|Large)"/g), 3);
});
