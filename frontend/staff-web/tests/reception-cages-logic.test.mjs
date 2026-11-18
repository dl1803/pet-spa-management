import assert from "node:assert/strict";
import test from "node:test";
import {
  countCages,
  DEFAULT_CAGE_FILTERS,
  describeCageCounts,
  describeCageKind,
  filterCages,
  findReturnAppointmentId,
  getCageState,
  isReturnToday,
  sortCages,
} from "../features/reception-cages/cages.ts";
import { createMockCages, createMockInStayRefs } from "../features/reception-cages/mock-data.ts";
import { mockListCages, mockListInStayRefs } from "../features/reception-cages/mock-api.ts";
import { buildMockReceptionAppointments } from "../features/reception-appointments/mock-data.ts";

const NOW = new Date("2026-11-08T02:00:00Z"); // 09:00 ngày 08/11/2026 ở cửa hàng
const TODAY = "2026-11-08";
const cages = createMockCages(NOW);
const byCode = (code) => cages.find((cage) => cage.code === code);

test("dữ liệu mô phỏng: 12 chuồng, mã duy nhất, 3 chuồng đang chứa, 1 chuồng ngừng sử dụng", () => {
  assert.equal(cages.length, 12);
  assert.equal(new Set(cages.map((cage) => cage.code)).size, 12);
  assert.equal(new Set(cages.map((cage) => cage.cageId)).size, 12);
  assert.deepEqual(cages.filter((cage) => cage.occupant).map((cage) => cage.code).sort(), ["A2", "B1", "D2"]);
  assert.deepEqual(cages.filter((cage) => !cage.isActive).map((cage) => cage.code), ["A4"]);
});

test("getCageState: ngừng sử dụng luôn là inactive; có occupant là occupied; còn lại là empty", () => {
  assert.equal(getCageState(byCode("A4")), "inactive");
  assert.equal(getCageState({ ...byCode("A4"), occupant: byCode("B1").occupant }), "inactive");
  assert.equal(getCageState(byCode("B1")), "occupied");
  assert.equal(getCageState(byCode("A1")), "empty");
  assert.equal(getCageState({ ...byCode("A1"), occupant: undefined }), "empty");
});

test("countCages và describeCageCounts: bỏ câu cuối khi không có chuồng ngừng sử dụng", () => {
  const counts = countCages(cages);
  assert.deepEqual(counts, { active: 11, occupied: 3, empty: 8, inactive: 1 });
  assert.equal(describeCageCounts(counts), "11 chuồng đang sử dụng: 3 đang chứa, 8 trống. 1 chuồng ngừng sử dụng.");
  assert.equal(describeCageCounts({ active: 2, occupied: 1, empty: 1, inactive: 0 }), "2 chuồng đang sử dụng: 1 đang chứa, 1 trống.");
  assert.equal(describeCageCounts(countCages([])), "0 chuồng đang sử dụng: 0 đang chứa, 0 trống.");
});

test("sortCages: theo mã có số (A2 trước A10), không đổi mảng gốc", () => {
  const input = [{ code: "B1" }, { code: "A10" }, { code: "A2" }];
  assert.deepEqual(sortCages(input).map((cage) => cage.code), ["A2", "A10", "B1"]);
  assert.deepEqual(input.map((cage) => cage.code), ["B1", "A10", "A2"]);
  assert.deepEqual(sortCages(cages).map((cage) => cage.code), ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "D1", "D2"]);
});

test("filterCages: loài, nhóm kích cỡ và tình trạng; chuồng ngừng sử dụng chỉ ở tình trạng Tất cả", () => {
  const codes = (filters) => filterCages(cages, { ...DEFAULT_CAGE_FILTERS, ...filters }).map((cage) => cage.code);
  assert.equal(codes({}).length, 12);
  assert.deepEqual(codes({ species: "Dog" }), ["A1", "A2", "A3", "A4"]);
  assert.deepEqual(codes({ species: "GuineaPig" }), ["D1", "D2"]);
  assert.deepEqual(codes({ size: "Medium" }), ["A2", "A4", "B1", "B3", "C2"]);
  assert.deepEqual(codes({ state: "occupied" }), ["A2", "B1", "D2"]);
  assert.equal(codes({ state: "empty" }).includes("A4"), false);
  assert.equal(codes({ state: "empty" }).length, 8);
  assert.deepEqual(codes({ species: "Dog", size: "Medium", state: "empty" }), []);
  assert.deepEqual(codes({ species: "Cat", state: "occupied" }), ["B1"]);
});

test("describeCageKind: loài và nhóm kích cỡ", () => {
  assert.equal(describeCageKind(byCode("A1")), "Chó, nhóm Nhỏ");
  assert.equal(describeCageKind(byCode("D2")), "Chuột lang, nhóm Lớn");
});

test("isReturnToday: chỉ chuồng đang chứa có giờ trả dự kiến trong ngày cửa hàng", () => {
  assert.equal(isReturnToday(byCode("B1"), TODAY), true);
  assert.equal(isReturnToday(byCode("A2"), TODAY), false);
  assert.equal(isReturnToday(byCode("D2"), TODAY), false);
  assert.equal(isReturnToday(byCode("A1"), TODAY), false);
  assert.equal(isReturnToday(byCode("A4"), TODAY), false);
  assert.equal(isReturnToday(byCode("B1"), "2026-11-09"), false);
});

test("findReturnAppointmentId: tìm lịch theo petId của thú cưng trong chuồng; không có thì null", () => {
  const refs = createMockInStayRefs();
  assert.equal(findReturnAppointmentId(byCode("B1"), refs), "a1000000-0000-4000-8000-000000000008");
  assert.equal(findReturnAppointmentId(byCode("B1"), []), null);
  assert.equal(findReturnAppointmentId(byCode("A1"), refs), null);
});

test("khớp dữ liệu màn Lịch hẹn: C1 là chuồng của Cốm, B1 là chuồng và thú cưng của Tuyết", () => {
  const rows = buildMockReceptionAppointments(TODAY);
  const tuyet = rows.find((row) => row.appointment.petName === "Tuyết");
  const com = rows.find((row) => row.appointment.petName === "Cốm");
  assert.equal(tuyet.cageCode, "B1");
  assert.equal(tuyet.appointment.cageId, byCode("B1").cageId);
  assert.equal(tuyet.appointment.petId, byCode("B1").occupant.petId);
  assert.equal(tuyet.appointment.customerId, byCode("B1").occupant.customerId);
  const ref = createMockInStayRefs().find((item) => item.petId === tuyet.appointment.petId);
  assert.equal(ref.appointmentId, tuyet.appointment.appointmentId);
  assert.equal(com.cageCode, "C1");
  assert.equal(com.appointment.cageId, byCode("C1").cageId);
});

test("mock API: trả đủ 12 chuồng và 3 lịch đang lưu trú", async () => {
  assert.equal((await mockListCages()).length, 12);
  assert.equal((await mockListInStayRefs()).length, 3);
});
