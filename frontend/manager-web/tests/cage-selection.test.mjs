import assert from "node:assert/strict";
import test from "node:test";
import { formatShortDate, formatTime } from "../lib/format.ts";
import { buildCageChoices, canConfirmCage, getCageDetail, getInitialCageId } from "../features/pending/cage-selection.ts";

const cage = (cageId, code, species, sizeGroup, extra = {}) => ({ cageId, code, species, sizeGroup, isActive: true, occupant: null, ...extra });
const occupant = (plannedCheckOut) => ({ petId: "p", petName: "Kem", customerId: "c", customerName: "Hà", plannedCheckOut });
// Lịch lưu trú: nhận 09:00 ngày 08/10, trả 17:00 ngày 10/10.
const stay = { species: "Cat", sizeGroup: "Medium", plannedCheckIn: "2026-10-08T09:00:00+07:00", plannedCheckOut: "2026-10-10T17:00:00+07:00" };
const b1 = cage("1", "B1", "Cat", "Medium", { occupant: occupant("2026-10-06T18:00:00+07:00") });
const b2 = cage("2", "B2", "Cat", "Small");
const b3 = cage("3", "B3", "Cat", "Medium");
const b4 = cage("4", "B4", "Cat", "Large");
const d1 = cage("5", "D1", "Dog", "Medium");
const b5 = cage("6", "B5", "Cat", "Medium", { isActive: false });
const codes = (choices) => choices.map((c) => c.cage.code);

test("chuồng đề xuất đứng đầu, kế đến chuồng cùng nhóm, cuối cùng chuồng khác nhóm", () => {
  const choices = buildCageChoices({ cage: b3 }, [b1, b2, b3, b4], stay);
  assert.deepEqual(choices.map((c) => [c.cage.code, c.isSuggested, c.isEligible, c.blockReason]), [
    ["B3", true, true, null],
    ["B1", false, true, null],
    ["B2", false, false, "size"],
    ["B4", false, false, "size"],
  ]);
});

test("chuồng còn thú cưng đến sau giờ nhận bị khóa; trả đúng giờ nhận hoặc trước đó thì chọn được", () => {
  const late = cage("7", "B7", "Cat", "Medium", { occupant: occupant("2026-10-09T12:00:00+07:00") });
  const sameTime = cage("8", "B8", "Cat", "Medium", { occupant: occupant("2026-10-08T09:00:00+07:00") });
  const choices = buildCageChoices({ cage: b3 }, [late, sameTime, b1], stay);
  assert.deepEqual(choices.map((c) => [c.cage.code, c.isEligible, c.blockReason]), [
    ["B3", true, null],
    ["B8", true, null],
    ["B1", true, null],
    ["B7", false, "occupied"],
  ]);
});

test("bỏ chuồng ngừng sử dụng và khác loài; chuồng đề xuất không bị lặp", () => {
  assert.deepEqual(codes(buildCageChoices({ cage: b3 }, [b5, d1, b3, b1], stay)), ["B3", "B1"]);
});

test("chuồng đề xuất cũng bị lọc: ngừng sử dụng hoặc khác loài thì không hiển thị", () => {
  assert.deepEqual(codes(buildCageChoices({ cage: b5 }, [b1, b3], stay)), ["B1", "B3"]);
  assert.deepEqual(codes(buildCageChoices({ cage: d1 }, [b1, b3], stay)), ["B1", "B3"]);
});

test("chuồng đề xuất khác nhóm hoặc còn thú cưng thì bị khóa và không có nhãn đề xuất", () => {
  const wrongSize = buildCageChoices({ cage: b2 }, [b3], stay);
  assert.deepEqual(wrongSize.map((c) => [c.cage.code, c.isSuggested, c.isEligible]), [["B3", false, true], ["B2", false, false]]);
  const busy = cage("9", "B9", "Cat", "Medium", { occupant: occupant("2026-10-09T12:00:00+07:00") });
  assert.deepEqual(buildCageChoices({ cage: busy }, [b3], stay).map((c) => [c.cage.code, c.isSuggested, c.isEligible]), [["B3", false, true], ["B9", false, false]]);
});

test("đề xuất luôn có mặt dù danh sách chuồng không chứa nó", () => {
  assert.deepEqual(codes(buildCageChoices({ cage: b3 }, [], stay)), ["B3"]);
});

test("chọn sẵn chuồng đề xuất; nếu đề xuất bị khóa thì chọn chuồng chọn được đầu tiên; không có thì rỗng", () => {
  assert.equal(getInitialCageId(buildCageChoices({ cage: b3 }, [b1], stay)), "3");
  assert.equal(getInitialCageId(buildCageChoices({ cage: b2 }, [b1, b3], stay)), "1");
  assert.equal(getInitialCageId(buildCageChoices({ cage: b2 }, [b4], stay)), "");
  assert.equal(getInitialCageId([]), "");
});

test("chỉ cho xác nhận khi chuồng đang chọn nằm trong các chuồng chọn được", () => {
  const choices = buildCageChoices({ cage: b3 }, [b1, b2], stay);
  assert.equal(canConfirmCage(choices, "3"), true);
  assert.equal(canConfirmCage(choices, "1"), true);
  assert.equal(canConfirmCage(choices, "2"), false);
  assert.equal(canConfirmCage(choices, ""), false);
  assert.equal(canConfirmCage(choices, "không-có"), false);
});

test("dòng mô tả theo UI demo", () => {
  const [suggested, occupied, small] = buildCageChoices({ cage: b3 }, [b1, b2, b3], stay);
  assert.equal(getCageDetail(suggested, 2), "Mèo, nhóm Vừa. Trống cả 2 đêm");
  assert.equal(getCageDetail(occupied, 2), "Mèo, nhóm Vừa. Trống từ 18:00 ngày 06/10");
  assert.equal(getCageDetail(small, 2), "Mèo, nhóm Nhỏ. Không phù hợp kích cỡ");
  const [, empty] = buildCageChoices({ cage: b3 }, [cage("7", "B7", "Cat", "Medium")], stay);
  assert.equal(getCageDetail(empty, 2), "Mèo, nhóm Vừa. Đang trống");
  const late = cage("8", "B8", "Cat", "Medium", { occupant: occupant("2026-10-09T12:00:00+07:00") });
  const blocked = buildCageChoices({ cage: b3 }, [late], stay)[1];
  assert.equal(getCageDetail(blocked, 2), "Mèo, nhóm Vừa. Còn thú cưng đến 12:00 ngày 09/10");
});

test("giờ và ngày theo múi giờ cửa hàng", () => {
  assert.equal(formatTime("2026-10-06T18:00:00+07:00"), "18:00");
  assert.equal(formatTime("2026-10-06T23:30:00Z"), "06:30");
  assert.equal(formatShortDate("2026-10-06T23:30:00Z"), "07/10");
});
