import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_CAGE_FILTERS } from "../features/reception-cages/cages.ts";
import { CageCard } from "../features/reception-cages/components/cage-card.tsx";
import { CageFiltersBar } from "../features/reception-cages/components/cage-filters.tsx";
import { createMockCages } from "../features/reception-cages/mock-data.ts";

const NOW = new Date("2026-11-08T02:00:00Z"); // 09:00 ngày 08/11/2026 ở cửa hàng
const render = (element) => renderToStaticMarkup(element);
const h = React.createElement;
const cages = createMockCages(NOW);
const byCode = (code) => cages.find((cage) => cage.code === code);
const RETURN_HREF = "/tra-thu-cung?appointmentId=a1000000-0000-4000-8000-000000000008";

test("CageCard chuồng trống: mã, nhãn Trống, loài và nhóm, nền kẻ sọc, không có thú cưng", () => {
  const html = render(h(CageCard, { cage: byCode("A1"), returnHref: null }));
  assert.match(html, /^<li /);
  assert.match(html, />A1<\/span>/);
  assert.match(html, />Trống<\/span>/);
  assert.match(html, /Chó, nhóm Nhỏ/);
  assert.match(html, /repeating-linear-gradient/);
  assert.doesNotMatch(html, /Chủ:|Trả dự kiến|Trả hôm nay|<a /);
});

test("CageCard đang chứa, chưa đến hạn trả: tên, loài và chủ, giờ trả dự kiến kèm ngày, không có nút", () => {
  const html = render(h(CageCard, { cage: byCode("A2"), returnHref: null }));
  assert.match(html, />Đang chứa<\/span>/);
  assert.match(html, />Bơ<\/div>/);
  assert.match(html, /Chó\. Chủ: Trương Hoài Nam/);
  assert.match(html, /Trả dự kiến 17:00, 09\/11/);
  assert.match(html, /border-\[#A6D3D7\]/);
  assert.doesNotMatch(html, /border-apricot|<a |Trả hôm nay/);
  const guineaPig = render(h(CageCard, { cage: byCode("D2"), returnHref: null }));
  assert.match(guineaPig, /Chuột lang\. Chủ: Lý Thảo/);
  assert.match(guineaPig, /Trả dự kiến 10:00, 11\/11/);
});

test("CageCard trả trong hôm nay: viền cam, giờ trả, nút Trả thú cưng dẫn tới lịch của thú cưng", () => {
  const html = render(h(CageCard, { cage: byCode("B1"), returnHref: RETURN_HREF }));
  assert.match(html, /border-apricot/);
  assert.match(html, /Trả hôm nay 18:00/);
  assert.match(html, new RegExp(`<a (?=[^>]*href="${RETURN_HREF.replace("?", "\\?")}")(?=[^>]*aria-label="Trả thú cưng Tuyết")[^>]*>Trả thú cưng</a>`));
  assert.doesNotMatch(html, /Trả dự kiến/);
  const withoutAppointment = render(h(CageCard, { cage: byCode("B1"), returnHref: "/tra-thu-cung" }));
  assert.match(withoutAppointment, /href="\/tra-thu-cung"/);
});

test("CageCard ngừng sử dụng: nhãn, nền xám, ghi chú không tính vào sức chứa, không có thú cưng", () => {
  const html = render(h(CageCard, { cage: byCode("A4"), returnHref: null }));
  assert.match(html, />Ngừng sử dụng<\/span>/);
  assert.match(html, /bg-\[#F1F4F5\]/);
  assert.match(html, /Không tính vào sức chứa/);
  assert.doesNotMatch(html, /Chủ:|<a /);
  const inactiveWithOccupant = render(h(CageCard, { cage: { ...byCode("A4"), occupant: byCode("B1").occupant }, returnHref: null }));
  assert.doesNotMatch(inactiveWithOccupant, /Chủ:/);
});

test("CageFiltersBar: 5 chip loài (chỉ chip đang chọn có aria-pressed true), ô nhóm kích cỡ, 3 nút tình trạng", () => {
  const html = render(h(CageFiltersBar, { filters: { ...DEFAULT_CAGE_FILTERS, species: "Cat", state: "occupied" }, onChange: () => {} }));
  for (const label of ["Tất cả loài", "Chó", "Mèo", "Thỏ", "Chuột lang"]) assert.match(html, new RegExp(`>${label}<`));
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*>Mèo<\/button>/);
  assert.match(html, /<button[^>]*aria-pressed="false"[^>]*>Chó<\/button>/);
  assert.match(html, /aria-label="Lọc theo loài"/);
  assert.match(html, /<select[^>]*aria-label="Nhóm kích cỡ"/);
  for (const label of ["Mọi nhóm kích cỡ", "Nhỏ", "Vừa", "Lớn"]) assert.match(html, new RegExp(`<option[^>]*>${label}</option>`));
  assert.match(html, /aria-label="Lọc theo tình trạng"/);
  assert.match(html, /<button[^>]*aria-pressed="true"[^>]*>Đang chứa<\/button>/);
  assert.match(html, /<button[^>]*aria-pressed="false"[^>]*>Trống<\/button>/);
  assert.match(html, /<button[^>]*aria-pressed="false"[^>]*>Tất cả<\/button>/);
});
