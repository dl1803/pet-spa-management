import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SlotPicker } from "../features/reception-booking/components/slot-picker.tsx";
import { SpaBookingSummary } from "../features/reception-booking/components/spa-booking-summary.tsx";
import { SpaScheduleCard } from "../features/reception-booking/components/spa-schedule-card.tsx";
import { SpaServiceList, SpaServiceListSkeleton } from "../features/reception-booking/components/spa-service-list.tsx";
import {
  addMinutesToTime,
  describeStaffNeed,
  formatDateChip,
  formatDuration,
  formatSlotRange,
  formatSpaTime,
  formatStaffNeed,
  getApplicableServices,
  getBookingDates,
  isSlotFullError,
  summarizeSelection,
  toSpaBookingRequest,
} from "../features/reception-booking/spa-forms.ts";
import { ApiError } from "../lib/api/errors.ts";

const BAP = {
  petId: "p1",
  customerId: "c1",
  name: "Bắp",
  species: "Dog",
  breed: "Corgi",
  temperament: "Difficult",
  weightKg: 11,
  sizeGroup: "Medium",
  isActive: true,
};
const MUOP = { ...BAP, petId: "p2", name: "Mướp", species: "Cat", breed: "Anh lông ngắn", temperament: "Calm", sizeGroup: "Small" };

const row = (species, sizeGroup, price, durationMinutes, staffRequired) => ({ species, sizeGroup, price, durationMinutes, staffRequired });
const service = (serviceId, name, latestStartTime, pricing) => ({ serviceId, name, latestStartTime, isActive: true, pricing });
const TAM = service("s1", "Tắm & sấy lông", "18:00", [row("Dog", "Medium", 180000, 75, 1), row("Cat", "Small", 120000, 45, 1)]);
const CAT_TIA = service("s2", "Cắt tỉa lông", "18:00", [row("Dog", "Medium", 150000, 75, 1)]);
const MEO_ONLY = service("s3", "Vệ sinh tai", "17:00", [row("Cat", "Small", 60000, 25, 1)]);
const APPLICABLE = getApplicableServices([TAM, CAT_TIA, MEO_ONLY], BAP);

const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("getApplicableServices và summarizeSelection: đúng dòng giá, tối thiểu 2 nhân viên khi khó tính", () => {
  assert.deepEqual(
    APPLICABLE.map(({ service: item }) => item.serviceId),
    ["s1", "s2"],
  );
  assert.equal(APPLICABLE[0].pricing.price, 180000);
  assert.deepEqual(summarizeSelection(BAP, APPLICABLE), { totalPrice: 330000, totalMinutes: 150, staffRequired: 2 });
  assert.deepEqual(summarizeSelection(MUOP, getApplicableServices([TAM], MUOP)), {
    totalPrice: 120000,
    totalMinutes: 45,
    staffRequired: 1,
  });
  assert.deepEqual(summarizeSelection(BAP, []), { totalPrice: 0, totalMinutes: 0, staffRequired: 2 });
  const INACTIVE = { ...TAM, serviceId: "s4", isActive: false };
  assert.deepEqual(getApplicableServices([INACTIVE], BAP), []);
});

test("ngày giờ: dải 7 ngày, nhãn ngày, khoảng giờ, thời lượng, mốc kết thúc", () => {
  const dates = getBookingDates("2026-10-06");
  assert.equal(dates.length, 7);
  assert.deepEqual([dates[0], dates[1], dates[6]], ["2026-10-06", "2026-10-07", "2026-10-12"]);
  assert.deepEqual(formatDateChip("2026-10-08"), { weekday: "T5", day: "08/10" });
  assert.equal(addMinutesToTime("15:00", 75), "16:15");
  assert.equal(addMinutesToTime("23:30", 60), "00:30");
  assert.equal(formatSlotRange("15:00", 75), "15:00 – 16:15");
  assert.equal(formatDuration(75), "1 giờ 15 phút");
  assert.equal(formatDuration(120), "2 giờ");
  assert.equal(formatDuration(45), "45 phút");
  assert.equal(formatSpaTime("2026-10-08", "15:00", 75), "T5 08/10, 15:00 – 16:15");
});

test("số nhân viên cần: câu giải thích và nhãn tóm tắt", () => {
  assert.equal(
    describeStaffNeed(BAP, 2, 75),
    "Bắp khó tính nên lịch cần 2 nhân viên trong 1 giờ 15 phút. Các mốc đã kín là lúc cửa hàng không có đủ 2 nhân viên rảnh.",
  );
  assert.equal(
    describeStaffNeed(MUOP, 1, 45),
    "Lịch này cần 1 nhân viên trong 45 phút. Các mốc đã kín là lúc cửa hàng không có đủ 1 nhân viên rảnh.",
  );
  assert.equal(formatStaffNeed(BAP, 2), "2 (bé khó tính)");
  assert.equal(formatStaffNeed(MUOP, 2), "2");
  assert.equal(formatStaffNeed(MUOP, 1), "1");
});

test("toSpaBookingRequest: chỉ gồm petId, serviceIds, slotStart, customerId", () => {
  assert.deepEqual(toSpaBookingRequest("c1", "p1", { serviceIds: ["s1", "s2"], date: "2026-10-08", slotTime: "15:00" }), {
    petId: "p1",
    serviceIds: ["s1", "s2"],
    slotStart: "2026-10-08T15:00:00+07:00",
    customerId: "c1",
  });
});

test("isSlotFullError: chỉ 409 SLOT_FULL", () => {
  assert.equal(isSlotFullError(new ApiError({ kind: "http", status: 409, code: "SLOT_FULL", title: "Mốc giờ đã kín" })), true);
  assert.equal(isSlotFullError(new ApiError({ kind: "http", status: 409, code: "NO_CAPACITY", title: "Hết chỗ" })), false);
  assert.equal(isSlotFullError(new Error("x")), false);
});

test("SpaServiceList: mỗi dịch vụ một ô chọn, dịch vụ đang chọn được đánh dấu, lỗi gắn với danh sách", () => {
  const html = render(SpaServiceList, {
    applicable: APPLICABLE,
    selectedIds: ["s1"],
    onToggle: () => {},
    error: "Vui lòng chọn ít nhất một dịch vụ.",
  });
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
  assert.equal((html.match(/checked=""/g) ?? []).length, 1);
  assert.match(html, /Tắm &amp; sấy lông/);
  assert.match(html, /180\.000đ/);
  assert.match(html, /75 phút/);
  assert.match(html, /Nhận đến 18:00/);
  assert.match(html, /Vui lòng chọn ít nhất một dịch vụ\./);
  assert.match(html, /aria-describedby="reception-spa-service-error"/);
  assert.match(render(SpaServiceListSkeleton, {}), /Đang tải dịch vụ…/);
});

const SLOTS = [
  { time: "09:00", group: "Sáng", status: "Full" },
  { time: "12:00", group: "Trưa", status: "Available" },
  { time: "15:00", group: "Chiều", status: "Available" },
  { time: "18:00", group: "Chiều", status: "NotAccepted" },
];

test("SlotPicker: chia 3 nhóm theo giờ, mốc đang chọn ghi giờ kết thúc, mốc kín và không nhận bị khóa", () => {
  const html = render(SlotPicker, {
    legend: "Khung giờ",
    slots: SLOTS,
    value: "15:00",
    onChange: () => {},
    getEndTime: () => "16:15",
  });
  for (const group of ["Sáng", "Trưa", "Chiều, tối"]) assert.match(html, new RegExp(group));
  assert.match(html, /kết thúc 16:15/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.equal((html.match(/<button[^>]*\sdisabled(?=[>\s=])/g) ?? []).length, 2);
  assert.match(html, /Đã kín/);
  assert.match(html, /Không nhận/);
  assert.match(html, /<legend class="sr-only">Khung giờ<\/legend>/);
});

const SPA_SLOTS = { durationMinutes: 75, staffRequired: 2, bufferMinutes: 15, slots: SLOTS };
const SCHEDULE = {
  pet: BAP,
  dates: ["2026-10-06", "2026-10-07"],
  date: "2026-10-07",
  onDateChange: () => {},
  hasServices: true,
  slots: SPA_SLOTS,
  isLoading: false,
  error: null,
  onRetry: () => {},
  slotTime: "15:00",
  onSlotChange: () => {},
  isSlotFull: false,
};

test("SpaScheduleCard: ngày, mốc giờ, câu số nhân viên và từng trạng thái", () => {
  const ready = render(SpaScheduleCard, SCHEDULE);
  assert.match(ready, /T3/);
  assert.match(ready, /07\/10/);
  assert.equal((ready.match(/aria-pressed="true"/g) ?? []).length, 2);
  assert.match(ready, /kết thúc 16:15/);
  assert.match(ready, /Bắp khó tính nên lịch cần 2 nhân viên trong 1 giờ 15 phút\./);

  assert.match(
    render(SpaScheduleCard, { ...SCHEDULE, hasServices: false, slots: undefined }),
    /Chọn ít nhất một dịch vụ để xem khung giờ còn chỗ\./,
  );
  assert.match(render(SpaScheduleCard, { ...SCHEDULE, isLoading: true, slots: undefined }), /Đang tải khung giờ…/);

  const failed = render(SpaScheduleCard, { ...SCHEDULE, slots: undefined, error: new Error("x") });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Thử lại/);

  const dayFull = render(SpaScheduleCard, {
    ...SCHEDULE,
    slots: { ...SPA_SLOTS, slots: [{ time: "09:00", group: "Sáng", status: "Full" }] },
  });
  assert.match(dayFull, /Ngày này đã kín, vui lòng chọn ngày khác\./);

  const slotFull = render(SpaScheduleCard, {
    ...SCHEDULE,
    isSlotFull: true,
    slotError: "Vui lòng chọn một khung giờ còn chỗ.",
  });
  assert.match(slotFull, /Mốc giờ vừa kín, vui lòng chọn mốc khác\./);
  assert.match(slotFull, /Vui lòng chọn một khung giờ còn chỗ\./);
  assert.match(slotFull, /aria-describedby="reception-spa-slot-error"/);
});

test("SpaBookingSummary: dịch vụ, thời gian, số nhân viên, tạm tính và trạng thái gửi", () => {
  const html = render(SpaBookingSummary, {
    pet: BAP,
    selected: [APPLICABLE[0]],
    timeText: "T5 08/10, 15:00 – 16:15",
    staffText: "2 (bé khó tính)",
    totalPrice: 180000,
    isSubmitting: false,
    submitError: null,
  });
  assert.match(html, /Chó Corgi, nhóm Vừa/);
  assert.match(html, /Tắm &amp; sấy lông/);
  assert.match(html, /T5 08\/10, 15:00 – 16:15/);
  assert.match(html, /2 \(bé khó tính\)/);
  assert.match(html, /Tạm tính/);
  assert.match(html, /180\.000đ/);
  assert.match(html, /Tạo lịch hẹn spa/);
  assert.match(html, /Lịch tạo ra ở trạng thái Chờ xác nhận\./);
  assert.doesNotMatch(html, /<button[^>]*type="submit"[^>]*\sdisabled(?=[>\s=])/);

  const empty = render(SpaBookingSummary, {
    pet: BAP,
    selected: [],
    timeText: null,
    staffText: null,
    totalPrice: 0,
    isSubmitting: true,
    submitError: new Error("x"),
  });
  assert.match(empty, /Chưa chọn dịch vụ\./);
  assert.doesNotMatch(empty, /Tạm tính/);
  assert.match(empty, /aria-busy="true"/);
  assert.match(empty, /role="alert"/);
});
