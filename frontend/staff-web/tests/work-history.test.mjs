import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkHistoryTable } from "../features/work-history/components/work-history-table.tsx";
import {
  WORK_HISTORY_PAGE_SIZE,
  buildWorkHistoryEntries,
  filterByMonth,
  formatMonthLabel,
  listMonthKeys,
  paginate,
  parsePage,
  resolveMonthKey,
  selectWorkHistory,
} from "../features/work-history/list.ts";
import { MOCK_WORK_HISTORY } from "../features/work-history/mock-data.ts";

const entries = selectWorkHistory(MOCK_WORK_HISTORY);
const names = (list) => list.map((entry) => entry.appointment.petName);
const count = (html, pattern) => (html.match(pattern) ?? []).length;

function makeEntry(index, overrides = {}) {
  const day = String(index + 1).padStart(2, "0");
  return {
    species: "Dog",
    appointment: {
      appointmentId: `a0000000-0000-4000-8000-0000000001${day}`,
      type: "Spa",
      customerId: "c0000000-0000-4000-8000-000000000001",
      petId: "b0000000-0000-4000-8000-000000000001",
      petName: `Bé ${day}`,
      status: "Completed",
      sizeGroup: "Small",
      slotStart: `2026-10-${day}T09:00:00+07:00`,
      slotEnd: `2026-10-${day}T10:00:00+07:00`,
      createdAt: "2026-09-01T09:00:00+07:00",
      updatedAt: "2026-10-01T09:00:00+07:00",
      ...overrides,
    },
  };
}

test("dữ liệu mô phỏng: 8 lịch spa đã hoàn tất, mới nhất trước", () => {
  assert.equal(entries.length, 8);
  assert.deepEqual(names(entries), ["Bông", "Bi", "Na", "Lu", "Thỏ Sữa", "Bánh Bao", "Mít", "Pudding"]);
  assert.ok(entries.every((entry) => entry.appointment.type === "Spa" && entry.appointment.status === "Completed"));
  assert.equal(new Set(entries.map((entry) => entry.appointment.appointmentId)).size, 8);
});

test("chỉ giữ lịch spa Hoàn tất có giờ hẹn; không sửa mảng đầu vào", () => {
  const input = [
    makeEntry(1),
    makeEntry(2, { status: "Cancelled" }),
    makeEntry(3, { status: "InProgress" }),
    makeEntry(4, { type: "Hotel", slotStart: null, slotEnd: null }),
    makeEntry(5, { slotStart: null }),
    makeEntry(6, { slotEnd: null }),
  ];
  const snapshot = input.map((entry) => entry.appointment.petName);
  assert.deepEqual(names(selectWorkHistory(input)), ["Bé 02"]);
  assert.deepEqual(input.map((entry) => entry.appointment.petName), snapshot);
});

test("tháng: danh sách tháng mới nhất trước, nhãn, chọn tháng mặc định khi tham số sai", () => {
  const months = listMonthKeys(entries);
  assert.deepEqual(months, ["2026-10", "2026-09"]);
  assert.equal(formatMonthLabel("2026-10"), "Tháng 10/2026");
  assert.equal(resolveMonthKey("2026-09", months), "2026-09");
  assert.equal(resolveMonthKey("2026-08", months), "2026-10");
  assert.equal(resolveMonthKey("abc", months), "2026-10");
  assert.equal(resolveMonthKey(null, months), "2026-10");
  assert.equal(resolveMonthKey(null, []), null);
});

test("lọc theo tháng: 6 lịch tháng 10, 2 lịch tháng 9, không có tháng thì rỗng", () => {
  assert.equal(filterByMonth(entries, "2026-10").length, 6);
  assert.deepEqual(names(filterByMonth(entries, "2026-09")), ["Mít", "Pudding"]);
  assert.deepEqual(filterByMonth(entries, null), []);
});

test("tháng tính theo múi giờ cửa hàng, không theo UTC", () => {
  // 00:30 ngày 01/10 ở cửa hàng là 17:30 UTC ngày 30/09.
  const edge = makeEntry(1, { slotStart: "2026-10-01T00:30:00+07:00", slotEnd: "2026-10-01T01:30:00+07:00" });
  assert.deepEqual(listMonthKeys([edge]), ["2026-10"]);
});

test("phân trang: cỡ trang 20, trang quá lớn lùi về trang cuối, trang sai về 1", () => {
  const many = Array.from({ length: 45 }, (_, index) => index);
  assert.equal(WORK_HISTORY_PAGE_SIZE, 20);
  assert.equal(paginate(many, 1, 20).items.length, 20);
  assert.deepEqual(paginate(many, 3, 20).items, [40, 41, 42, 43, 44]);
  assert.equal(paginate(many, 99, 20).page, 3);
  assert.equal(paginate([], 5, 20).page, 1);
  assert.equal(parsePage("2"), 2);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("-1"), 1);
  assert.equal(parsePage("1.5"), 1);
  assert.equal(parsePage("abc"), 1);
  assert.equal(parsePage(null), 1);
});

test("bảng: 6 dòng tháng 10, cột, nhãn Hoàn tất, liên kết Xem tới màn thực hiện", () => {
  const html = renderToStaticMarkup(React.createElement(WorkHistoryTable, { entries: filterByMonth(entries, "2026-10") }));
  for (const header of ["Ngày", "Khung giờ", "Thú cưng", "Dịch vụ", "Trạng thái"]) {
    assert.match(html, new RegExp(`<th scope="col"[^>]*>${header}</th>`));
  }
  assert.equal(count(html, /<tr\b/g), 7); // 1 dòng tiêu đề + 6 dòng dữ liệu
  assert.equal(count(html, /Hoàn tất/g), 6);
  assert.match(html, /06\/10\/2026/);
  assert.match(html, /09:00 – 11:00/);
  assert.match(html, /Tắm &amp; sấy lông, Cắt tỉa lông/);
  assert.match(html, /Thỏ Sữa/);
  assert.equal(count(html, /href="\/lich-hen\/a0000000-0000-4000-8000-0000000000\d\d\/thuc-hien"/g), 6);
  assert.match(html, /aria-label="Xem lịch của Bông"/);
});

test("bảng: dịch vụ thiếu tên hiện dấu gạch, thiếu tên thú cưng không làm vỡ", () => {
  const entry = makeEntry(1, { petName: undefined, services: [{ serviceId: "x", isDone: true }] });
  const html = renderToStaticMarkup(React.createElement(WorkHistoryTable, { entries: [entry] }));
  assert.match(html, /<td class="px-4 py-3">—<\/td>/);
  assert.match(html, /<span class="font-semibold">—<\/span>/);
});

test("bảng: chưa có loài thì hiện ô trống thay cho hình thú cưng, các cột còn lại vẫn đủ", () => {
  const entry = { ...makeEntry(1), species: null };
  const html = renderToStaticMarkup(React.createElement(WorkHistoryTable, { entries: [entry] }));
  assert.doesNotMatch(html, /bg-sp-/);
  assert.match(html, /<span aria-hidden="true" class="size-\[34px\] shrink-0 rounded-\[11px\] bg-line-soft"><\/span>/);
  assert.match(html, /Bé 02/);
  assert.match(html, /Hoàn tất/);
});

test("các hàm chọn, lọc tháng, liệt kê tháng chạy trên dòng của danh sách (chưa có dịch vụ và loài)", () => {
  const summaries = [makeEntry(1), makeEntry(2, { status: "Cancelled" }), makeEntry(3)].map(({ appointment }) => ({ appointment }));
  const selected = selectWorkHistory(summaries);
  assert.deepEqual(selected.map((item) => item.appointment.petName), ["Bé 04", "Bé 02"]);
  assert.deepEqual(listMonthKeys(selected), ["2026-10"]);
  assert.equal(filterByMonth(selected, "2026-10").length, 2);
  assert.equal(filterByMonth(selected, "2026-09").length, 0);
});

test("ghép dòng: có chi tiết và loài thì dùng, thiếu thì giữ dòng của danh sách và loài null", () => {
  const [first, second] = [makeEntry(1).appointment, makeEntry(2).appointment];
  const detail = { ...first, services: [{ serviceId: "s1", name: "Tắm", isDone: true }] };
  const result = buildWorkHistoryEntries(
    [first, second],
    new Map([[first.appointmentId, detail]]),
    new Map([[first.petId, "Cat"]]),
  );
  assert.equal(result[0].appointment, detail);
  assert.equal(result[0].species, "Cat");
  assert.equal(result[1].appointment, second);
  assert.equal(result[1].species, "Cat");
  const noPet = buildWorkHistoryEntries([second], new Map(), new Map());
  assert.equal(noPet[0].species, null);
  assert.equal(noPet[0].appointment, second);
});
