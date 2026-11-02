import assert from "node:assert/strict";
import test from "node:test";
import { formatShortDate, formatTime } from "../lib/format.ts";
import { buildCageChoices, getCageDetail, getInitialCageId } from "../features/pending/cage-selection.ts";

const cage = (cageId, code, species, sizeGroup, extra = {}) => ({ cageId, code, species, sizeGroup, isActive: true, occupant: null, ...extra });
const b1 = cage("1", "B1", "Cat", "Medium", {
  occupant: { petId: "p", petName: "Kem", customerId: "c", customerName: "Hà", plannedCheckOut: "2026-10-06T18:00:00+07:00" },
});
const b2 = cage("2", "B2", "Cat", "Small");
const b3 = cage("3", "B3", "Cat", "Medium");
const b4 = cage("4", "B4", "Cat", "Large");
const d1 = cage("5", "D1", "Dog", "Medium");
const b5 = cage("6", "B5", "Cat", "Medium", { isActive: false });

test("chuồng đề xuất đứng đầu, kế đến chuồng cùng nhóm, cuối cùng chuồng khác nhóm", () => {
  const choices = buildCageChoices({ cage: b3 }, [b1, b2, b3, b4], "Cat", "Medium");
  assert.deepEqual(choices.map((c) => [c.cage.code, c.isSuggested, c.isEligible]), [
    ["B3", true, true],
    ["B1", false, true],
    ["B2", false, false],
    ["B4", false, false],
  ]);
});

test("bỏ chuồng ngừng sử dụng, chuồng khác loài; chuồng đề xuất không bị lặp", () => {
  const choices = buildCageChoices({ cage: b3 }, [b5, d1, b3, b1], "Cat", "Medium");
  assert.deepEqual(choices.map((c) => c.cage.code), ["B3", "B1"]);
});

test("đề xuất luôn có mặt dù danh sách chuồng không chứa nó", () => {
  assert.deepEqual(buildCageChoices({ cage: b3 }, [], "Cat", "Medium").map((c) => c.cage.code), ["B3"]);
});

test("chọn sẵn chuồng được đề xuất", () => {
  assert.equal(getInitialCageId({ cage: b3 }), "3");
});

test("dòng mô tả theo UI demo", () => {
  const [suggested, occupied, small] = buildCageChoices({ cage: b3 }, [b1, b2, b3], "Cat", "Medium");
  assert.equal(getCageDetail(suggested, 2), "Mèo, nhóm Vừa. Trống cả 2 đêm");
  assert.equal(getCageDetail(occupied, 2), "Mèo, nhóm Vừa. Trống từ 18:00 ngày 06/10");
  assert.equal(getCageDetail(small, 2), "Mèo, nhóm Nhỏ. Không phù hợp kích cỡ");
  const [, empty] = buildCageChoices({ cage: b3 }, [cage("7", "B7", "Cat", "Medium")], "Cat", "Medium");
  assert.equal(getCageDetail(empty, 2), "Mèo, nhóm Vừa. Đang trống");
});

test("giờ và ngày theo múi giờ cửa hàng", () => {
  assert.equal(formatTime("2026-10-06T18:00:00+07:00"), "18:00");
  assert.equal(formatTime("2026-10-06T23:30:00Z"), "06:30");
  assert.equal(formatShortDate("2026-10-06T23:30:00Z"), "07/10");
});
