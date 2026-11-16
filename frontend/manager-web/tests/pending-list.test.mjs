import assert from "node:assert/strict";
import test from "node:test";
import {
  countPendingAppointments,
  filterPendingAppointments,
  getListStamp,
  getPendingSubtitle,
  parsePendingTypeFilter,
  resolveSelectedAppointmentId,
  sortPendingAppointments,
} from "../features/pending/list.ts";
import { getPetProfileRows, getPetTitle } from "../features/pending/pet-summary.ts";

const spa = (id, slotStart, createdAt = "2026-10-05T08:00:00+07:00") => ({
  appointmentId: id, type: "Spa", status: "Pending", petName: id, sizeGroup: "Medium",
  slotStart, slotEnd: slotStart, staffRequired: 1, createdAt,
});
const hotel = (id, plannedCheckIn, plannedCheckOut, createdAt = "2026-10-05T08:00:00+07:00") => ({
  appointmentId: id, type: "Hotel", status: "Pending", petName: id, sizeGroup: "Small", plannedCheckIn, plannedCheckOut, createdAt,
});

const A = spa("a", "2026-10-07T13:00:00+07:00");
const B = spa("b", "2026-10-06T14:00:00+07:00");
const C = hotel("c", "2026-10-08T09:00:00+07:00", "2026-10-10T17:00:00+07:00");

test("tham số loại trên URL: chỉ nhận Spa, Hotel; còn lại là Tất cả", () => {
  assert.equal(parsePendingTypeFilter("Spa"), "Spa");
  assert.equal(parsePendingTypeFilter("Hotel"), "Hotel");
  for (const value of [null, "", "all", "spa", "Xyz"]) assert.equal(parsePendingTypeFilter(value), "all");
});

test("sắp theo giờ hẹn gần nhất (spa: giờ bắt đầu, lưu trú: giờ nhận), không sửa mảng gốc", () => {
  const input = [C, A, B];
  assert.deepEqual(sortPendingAppointments(input).map((item) => item.appointmentId), ["b", "a", "c"]);
  assert.deepEqual(input.map((item) => item.appointmentId), ["c", "a", "b"]);
});

test("giờ hẹn bằng nhau giữ thứ tự backend; thiếu giờ hẹn thì dùng giờ tạo lịch", () => {
  const first = spa("x", "2026-10-06T14:00:00+07:00");
  const second = spa("y", "2026-10-06T14:00:00+07:00");
  assert.deepEqual(sortPendingAppointments([first, second]).map((item) => item.appointmentId), ["x", "y"]);
  const noMoment = { ...spa("z", null), slotStart: null, createdAt: "2026-10-01T08:00:00+07:00" };
  assert.deepEqual(sortPendingAppointments([A, noMoment]).map((item) => item.appointmentId), ["z", "a"]);
});

test("lọc và đếm theo loại; tiêu đề phụ đếm trên toàn bộ danh sách", () => {
  const all = [A, B, C];
  assert.deepEqual(filterPendingAppointments(all, "all"), all);
  assert.deepEqual(filterPendingAppointments(all, "Spa").map((item) => item.appointmentId), ["a", "b"]);
  assert.deepEqual(filterPendingAppointments(all, "Hotel").map((item) => item.appointmentId), ["c"]);
  assert.deepEqual(countPendingAppointments(all), { spa: 2, hotel: 1 });
  assert.equal(getPendingSubtitle(all), "Spa 2, lưu trú 1. Xử lý theo thứ tự giờ hẹn gần nhất.");
  assert.equal(getPendingSubtitle([]), "Spa 0, lưu trú 0. Xử lý theo thứ tự giờ hẹn gần nhất.");
});

test("lịch đang chọn: đúng lịch được yêu cầu, không có thì lịch đầu tiên, danh sách rỗng thì null", () => {
  const visible = [B, A];
  assert.equal(resolveSelectedAppointmentId(visible, "a"), "a");
  assert.equal(resolveSelectedAppointmentId(visible, "khong-co"), "b");
  assert.equal(resolveSelectedAppointmentId(visible, null), "b");
  assert.equal(resolveSelectedAppointmentId([], "a"), null);
});

test("cuống phiếu: spa giờ và ngày, lưu trú ngày nhận và ngày trả, thiếu mốc thì ngày tạo lịch", () => {
  assert.deepEqual(getListStamp(B), { primary: "14:00", secondary: "06/10" });
  assert.deepEqual(getListStamp(C), { primary: "08/10", secondary: "→ 10/10" });
  assert.deepEqual(getListStamp({ ...C, plannedCheckOut: null }), { primary: "08/10", secondary: "" });
  assert.deepEqual(getListStamp({ ...B, slotStart: null }), { primary: "05/10", secondary: "" });
});

const pet = {
  petId: "p1", customerId: "c1", name: "Mochi", species: "Cat", breed: "Anh lông ngắn", temperament: "Calm",
  weightKg: 4.2, heightCm: null, coatNote: " Lông dễ rối ", notes: "  ", sizeGroup: "Medium", isActive: true,
};

test("tiêu đề thú cưng theo UI demo: tên, loài viết thường, giống, nhóm của lịch hẹn", () => {
  assert.equal(getPetTitle(pet, "Medium"), "Mochi, mèo Anh lông ngắn, nhóm Vừa");
  assert.equal(getPetTitle({ ...pet, species: "GuineaPig", breed: "Peru" }, "Small"), "Mochi, chuột lang Peru, nhóm Nhỏ");
});

test("hồ sơ thú cưng: ghi chú rỗng hoặc chỉ khoảng trắng bị bỏ, chiều cao chỉ hiện khi có", () => {
  assert.deepEqual(getPetProfileRows(pet), [
    { label: "Cân nặng", value: "4,2 kg" },
    { label: "Tính cách", value: "Hiền" },
    { label: "Ghi chú lông", value: "Lông dễ rối" },
  ]);
  const dog = { ...pet, species: "Dog", temperament: "Difficult", heightCm: 35.5, coatNote: null, notes: "Sợ máy sấy" };
  assert.deepEqual(getPetProfileRows(dog).map((row) => row.value), ["4,2 kg", "35,5 cm", "Khó tính, dữ", "Sợ máy sấy"]);
});
