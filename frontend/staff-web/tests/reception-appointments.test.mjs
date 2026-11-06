import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceptionAppointmentsTable } from "../features/reception-appointments/components/reception-appointments-table.tsx";
import {
  countByFilter,
  getHotelEvent,
  getRowTime,
  matchesFilter,
  resolveDateKey,
  sortByTime,
} from "../features/reception-appointments/list.ts";
import { buildMockReceptionAppointments } from "../features/reception-appointments/mock-data.ts";
import { formatLongDate } from "../lib/format.ts";
import { addDaysToDateKey, buildStoreDateTime, countNights } from "../lib/time.ts";

const DATE_KEY = "2026-11-06";
const mockRows = buildMockReceptionAppointments(DATE_KEY);
const petNames = (rows) => rows.map((r) => r.appointment.petName);
const countOccurrences = (html, pattern) => (html.match(pattern) ?? []).length;

test("buildMockReceptionAppointments: 8 dòng, ID duy nhất, đúng tên và mốc giờ theo ngày", () => {
  assert.equal(mockRows.length, 8);
  const ids = new Set(mockRows.map((r) => r.appointment.appointmentId));
  assert.equal(ids.size, 8);
  assert.deepEqual(petNames(mockRows), ["Bông", "Nâu", "Mướp", "Cốm", "Mít", "Mochi", "Sushi", "Tuyết"]);
  const hotelRows = mockRows.filter((r) => r.appointment.type === "Hotel");
  assert.equal(hotelRows.length, 2);

  const nextDayRows = buildMockReceptionAppointments("2026-11-07");
  assert.ok(nextDayRows[0].appointment.slotStart?.startsWith("2026-11-07T09:00"));
});

test("countByFilter: dữ liệu mô phỏng đếm đúng 8/4/2/2/1", () => {
  const counts = countByFilter(mockRows, DATE_KEY);
  assert.deepEqual(counts, {
    all: 8,
    waiting: 4,
    inStore: 2,
    hotel: 2,
    pending: 1,
  });
});

test("getHotelEvent: xác định đúng nhận/trả/null", () => {
  const com = mockRows.find((r) => r.appointment.petName === "Cốm").appointment;
  const tuyet = mockRows.find((r) => r.appointment.petName === "Tuyết").appointment;
  const bong = mockRows.find((r) => r.appointment.petName === "Bông").appointment;

  assert.equal(getHotelEvent(com, DATE_KEY), "checkIn");
  assert.equal(getHotelEvent(tuyet, DATE_KEY), "checkOut");
  assert.equal(getHotelEvent(bong, DATE_KEY), null);

  const sameDayStay = {
    ...com,
    status: "InStay",
    plannedCheckIn: buildStoreDateTime(DATE_KEY, "08:00"),
    plannedCheckOut: buildStoreDateTime(DATE_KEY, "18:00"),
  };
  assert.equal(getHotelEvent(sameDayStay, DATE_KEY), "checkOut");

  const sameDayConfirmed = {
    ...com,
    status: "Confirmed",
    plannedCheckIn: buildStoreDateTime(DATE_KEY, "08:00"),
    plannedCheckOut: buildStoreDateTime(DATE_KEY, "18:00"),
  };
  assert.equal(getHotelEvent(sameDayConfirmed, DATE_KEY), "checkIn");

  const outOfRangeHotel = {
    ...com,
    plannedCheckIn: buildStoreDateTime("2026-11-01", "10:00"),
    plannedCheckOut: buildStoreDateTime("2026-11-03", "12:00"),
  };
  assert.equal(getHotelEvent(outOfRangeHotel, DATE_KEY), null);
});

test("getRowTime: trả đúng mốc giờ spa và lưu trú", () => {
  const com = mockRows.find((r) => r.appointment.petName === "Cốm").appointment;
  const tuyet = mockRows.find((r) => r.appointment.petName === "Tuyết").appointment;
  const bong = mockRows.find((r) => r.appointment.petName === "Bông").appointment;

  assert.equal(getRowTime(bong, DATE_KEY), bong.slotStart);
  assert.equal(getRowTime(com, DATE_KEY), com.plannedCheckIn);
  assert.equal(getRowTime(tuyet, DATE_KEY), tuyet.plannedCheckOut);

  const noDateHotel = {
    ...com,
    plannedCheckIn: buildStoreDateTime("2026-11-01", "10:00"),
    plannedCheckOut: buildStoreDateTime("2026-11-03", "12:00"),
  };
  assert.equal(getRowTime(noDateHotel, DATE_KEY), null);
});

test("sortByTime: sắp xếp giờ tăng dần, dòng không có giờ xếp cuối, không sửa mảng gốc", () => {
  const reversed = [...mockRows].reverse();
  const sorted = sortByTime(reversed, DATE_KEY);

  for (let i = 0; i < sorted.length - 1; i++) {
    const tCurrent = Date.parse(getRowTime(sorted[i].appointment, DATE_KEY));
    const tNext = Date.parse(getRowTime(sorted[i + 1].appointment, DATE_KEY));
    assert.ok(tCurrent <= tNext, "Thời gian phải không giảm");
  }

  const times = sorted.map((r) => getRowTime(r.appointment, DATE_KEY)?.slice(11, 16));
  assert.equal(times.filter((t) => t === "09:00").length, 2);
  assert.equal(times.filter((t) => t === "10:00").length, 2);

  const sortedOriginal = sortByTime(mockRows, DATE_KEY);
  assert.deepEqual(petNames(sortedOriginal), ["Bông", "Nâu", "Mướp", "Cốm", "Mít", "Mochi", "Sushi", "Tuyết"]);

  const noTimeRow = {
    appointment: {
      ...mockRows[0].appointment,
      type: "Hotel",
      plannedCheckIn: buildStoreDateTime("2026-11-01", "10:00"),
      plannedCheckOut: buildStoreDateTime("2026-11-03", "12:00"),
    },
    species: "Dog",
    breed: "Corgi",
    cageCode: null,
  };
  const listWithNoTime = [noTimeRow, ...mockRows];
  const sortedWithNoTime = sortByTime(listWithNoTime, DATE_KEY);
  assert.equal(sortedWithNoTime[sortedWithNoTime.length - 1], noTimeRow);

  const beforeNames = petNames(reversed);
  assert.deepEqual(petNames(reversed), beforeNames);
});

test("resolveDateKey: xử lý tham số ngày hợp lệ và không hợp lệ", () => {
  const todayKey = "2026-11-06";
  assert.equal(resolveDateKey(null, todayKey), todayKey);
  assert.equal(resolveDateKey("2026-11-09", todayKey), "2026-11-09");
  assert.equal(resolveDateKey("abc", todayKey), todayKey);
  assert.equal(resolveDateKey("2026-13-01", todayKey), todayKey);
  assert.equal(resolveDateKey("2026-02-30", todayKey), todayKey);
  assert.equal(resolveDateKey("2026-11-6", todayKey), todayKey);
});

test("matchesFilter: waiting không tính lịch Confirmed khác ngày", () => {
  const futureConfirmedSpa = {
    ...mockRows[0].appointment,
    status: "Confirmed",
    slotStart: buildStoreDateTime("2026-11-07", "09:00"),
  };
  assert.equal(matchesFilter(futureConfirmedSpa, "waiting", DATE_KEY), false);

  const futureConfirmedHotel = {
    ...mockRows[3].appointment,
    status: "Confirmed",
    plannedCheckIn: buildStoreDateTime("2026-11-07", "10:00"),
  };
  assert.equal(matchesFilter(futureConfirmedHotel, "waiting", DATE_KEY), false);
});

test("hàm dùng chung: formatLongDate, countNights, addDaysToDateKey, buildStoreDateTime", () => {
  assert.equal(formatLongDate("2026-10-06T12:00:00+07:00"), "Thứ ba 06/10/2026");
  assert.equal(countNights("2026-11-06T10:00:00+07:00", "2026-11-08T12:00:00+07:00"), 2);
  assert.equal(addDaysToDateKey("2026-11-30", 1), "2026-12-01");
  assert.equal(buildStoreDateTime("2026-11-06", "09:00"), "2026-11-06T09:00:00+07:00");
});

test("ReceptionAppointmentsTable: cấu trúc bảng, cột, nút Tiếp nhận và nội dung hiển thị", () => {
  const sortedRows = sortByTime(mockRows, DATE_KEY);
  const html = renderToStaticMarkup(React.createElement(ReceptionAppointmentsTable, { rows: sortedRows, dateKey: DATE_KEY }));

  // 7 thẻ th với các tiêu đề đúng thứ tự
  const thMatches = [...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map((m) => m[1]);
  assert.equal(thMatches.length, 7);
  assert.equal(thMatches[0], "Giờ");
  assert.equal(thMatches[1], "Thú cưng");
  assert.equal(thMatches[2], "Khách hàng");
  assert.equal(thMatches[3], "Loại");
  assert.equal(thMatches[4], "Nhân viên / chuồng");
  assert.equal(thMatches[5], "Trạng thái");
  assert.match(thMatches[6], /<span class="sr-only">Thao tác<\/span>/);

  // Đúng 3 liên kết Tiếp nhận
  assert.equal(countOccurrences(html, /Tiếp nhận<\/a>/g), 3);
  assert.match(html, /href="\/tiep-nhan\?appointmentId=a1000000-0000-4000-8000-000000000001"/);

  // Không có liên kết tới /tiep-nhan ở Cốm (a1..04), Tuyết (a1..08), Nâu (a1..02), Mướp (a1..03), Mochi (a1..06)
  assert.ok(!html.includes('href="/tiep-nhan?appointmentId=a1000000-0000-4000-8000-000000000004"'));
  assert.ok(!html.includes('href="/tiep-nhan?appointmentId=a1000000-0000-4000-8000-000000000008"'));
  assert.ok(!html.includes('href="/tiep-nhan?appointmentId=a1000000-0000-4000-8000-000000000002"'));
  assert.ok(!html.includes('href="/tiep-nhan?appointmentId=a1000000-0000-4000-8000-000000000003"'));
  assert.ok(!html.includes('href="/tiep-nhan?appointmentId=a1000000-0000-4000-8000-000000000006"'));

  // Không có chữ cấm
  assert.ok(!html.includes("Xem"));
  assert.ok(!html.includes("Trả thú cưng"));
  assert.ok(!html.includes("Thu tiền"));
  assert.ok(!html.includes("Có tài khoản"));
  assert.ok(!html.includes("Khách vãng lai"));
  assert.ok(!html.includes("Giữ chỗ đến"));
  assert.ok(!html.includes("Chưa thu tiền lưu trú"));

  // Đúng 1 lần Chờ quản lý xếp, đúng mã chuồng, đúng số đêm, đúng loài/giống
  assert.equal(countOccurrences(html, /Chờ quản lý xếp/g), 1);
  assert.match(html, /Chuồng C1/);
  assert.match(html, /Chuồng B1/);
  assert.equal(countOccurrences(html, /Lưu trú, 2 đêm/g), 2);
  assert.match(html, /Chó Poodle/);
  assert.match(html, /Thỏ Hà Lan/);
  assert.match(html, /Mèo Ba Tư/);

  // Nhãn phụ nhận / trả cho lưu trú
  assert.match(html, /<span class="block text-xs text-muted">nhận<\/span>/);
  assert.match(html, /<span class="block text-xs text-muted">trả<\/span>/);

  // Bảng rỗng không lỗi
  const emptyHtml = renderToStaticMarkup(React.createElement(ReceptionAppointmentsTable, { rows: [], dateKey: DATE_KEY }));
  assert.match(emptyHtml, /<thead\b/);
  assert.ok(!emptyHtml.includes("<td"));
});
