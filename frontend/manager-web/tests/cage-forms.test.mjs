import assert from "node:assert/strict";
import test from "node:test";
import {
  FORM_MESSAGES,
  PRICING_SLOTS,
  SPECIES_SIZE_GROUPS,
  createCageFormValues,
  createHotelPricingFormValues,
  findPricingProblems,
  getSizeGroupOptions,
  isSpecies,
  parseMoneyInput,
  resolveSizeGroup,
  toCageRequest,
  toHotelPricingRequest,
  validateCode,
  validateLateFee,
  validateSizeGroup,
  validateSpecies,
} from "../features/cages/forms.ts";
import { CAGES_TABS, describeOccupant, getCageStatus, parseCagesTab, summarizeCages } from "../features/cages/list.ts";
import { MOCK_CAGES, MOCK_HOTEL_PRICING, createMockCage, setMockCageActive, updateMockCage } from "../features/cages/mock-data.ts";
import { ApiError } from "../lib/api/errors.ts";

const NOW = "2026-10-06T09:20:00+07:00";
const byCode = (cages, code) => cages.find((cage) => cage.code === code);
const isDuplicate = (error) => error instanceof ApiError && error.status === 409 && error.code === "DUPLICATE_CAGE_CODE" && error.title === FORM_MESSAGES.codeDuplicate;

test("dữ liệu mô phỏng khớp MW-07: 12 chuồng, sức chứa 11, đang chứa 3 (A2, B1, D2), trống 8, ngừng sử dụng 1", () => {
  assert.deepEqual(summarizeCages(MOCK_CAGES), { total: 12, capacity: 11, occupied: 3, occupiedCodes: ["A2", "B1", "D2"], empty: 8, inactive: 1 });
  assert.deepEqual(MOCK_CAGES.map((cage) => cage.code), ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "D1", "D2"]);
  assert.equal(new Set(MOCK_CAGES.map((cage) => cage.cageId)).size, 12);
  assert.deepEqual(MOCK_CAGES.map((cage) => getCageStatus(cage)), [
    "Empty", "Occupied", "Empty", "Inactive", "Occupied", "Empty", "Empty", "Empty", "Empty", "Empty", "Empty", "Occupied",
  ]);
  assert.deepEqual([byCode(MOCK_CAGES, "A4").species, byCode(MOCK_CAGES, "A4").sizeGroup, byCode(MOCK_CAGES, "D2").sizeGroup], ["Dog", "Medium", "Large"]);
});

test("chuồng ngừng sử dụng không tính vào sức chứa, đang chứa hay trống, kể cả khi còn thú cưng", () => {
  const stopped = MOCK_CAGES.map((cage) => (cage.code === "A2" ? { ...cage, isActive: false } : cage));
  assert.equal(getCageStatus(byCode(stopped, "A2")), "Inactive");
  assert.deepEqual(summarizeCages(stopped), { total: 12, capacity: 10, occupied: 2, occupiedCodes: ["B1", "D2"], empty: 8, inactive: 2 });
  assert.deepEqual(summarizeCages([]), { total: 0, capacity: 0, occupied: 0, occupiedCodes: [], empty: 0, inactive: 0 });
});

test("hạn trả: cùng ngày thì “hôm nay”, khác ngày thì dd/MM; không đọc đồng hồ", () => {
  assert.equal(describeOccupant(byCode(MOCK_CAGES, "A2").occupant, NOW), "Chủ: Trương Hoài Nam. Trả 17:00 07/10");
  assert.equal(describeOccupant(byCode(MOCK_CAGES, "B1").occupant, NOW), "Chủ: Nguyễn Hải Yến. Trả 18:00 hôm nay");
  assert.equal(describeOccupant(byCode(MOCK_CAGES, "D2").occupant, NOW), "Chủ: Lý Thảo. Trả 10:00 09/10");
});

test("tab trên URL: chỉ pricing là tab Giá, giá trị lạ hoặc thiếu về tab Chuồng", () => {
  assert.deepEqual(CAGES_TABS.map((tab) => [tab.value, tab.label]), [["cages", "Chuồng"], ["pricing", "Giá lưu trú và phí trả muộn"]]);
  assert.equal(parseCagesTab("pricing"), "pricing");
  for (const value of [null, "", "cages", "Pricing", "gia", "pricing "]) assert.equal(parseCagesTab(value), "cages", String(value));
});

test("thêm chuồng: thêm cuối danh sách, đang sử dụng, chưa có thú cưng; sức chứa và số tab tăng; không sửa danh sách cũ", () => {
  const next = createMockCage(MOCK_CAGES, toCageRequest({ code: " B5 ", species: "Cat", sizeGroup: "Medium" }), "id-moi");
  assert.equal(next.length, 13);
  assert.deepEqual(next.at(-1), { cageId: "id-moi", code: "B5", species: "Cat", sizeGroup: "Medium", isActive: true, occupant: null });
  assert.deepEqual(summarizeCages(next), { total: 13, capacity: 12, occupied: 3, occupiedCodes: ["A2", "B1", "D2"], empty: 9, inactive: 1 });
  assert.equal(MOCK_CAGES.length, 12);
});

test("thêm chuồng trùng mã (kể cả chuồng đã ngừng sử dụng): 409 DUPLICATE_CAGE_CODE, danh sách giữ nguyên", () => {
  for (const code of ["B3", "A4", " B3 "]) {
    assert.throws(() => createMockCage(MOCK_CAGES, { code, species: "Cat", sizeGroup: "Medium" }, "id-moi"), isDuplicate, code);
  }
  assert.equal(MOCK_CAGES.length, 12);
});

test("mã chuồng so sánh đúng từng ký tự như ràng buộc UNIQUE: khác hoa thường là mã khác", () => {
  assert.equal(createMockCage(MOCK_CAGES, { code: "b3", species: "Cat", sizeGroup: "Medium" }, "id-moi").length, 13);
});

test("sửa chuồng: đổi mã, loài, nhóm; giữ trạng thái sử dụng và thú cưng đang chứa; giữ nguyên mã của chính nó thì hợp lệ", () => {
  const a2 = byCode(MOCK_CAGES, "A2");
  const next = updateMockCage(MOCK_CAGES, a2.cageId, toCageRequest({ code: "A2", species: "Dog", sizeGroup: "Large" }));
  assert.deepEqual(byCode(next, "A2"), { ...a2, sizeGroup: "Large" });
  assert.deepEqual(next.filter((cage) => cage.code !== "A2"), MOCK_CAGES.filter((cage) => cage.code !== "A2"));
  const renamed = updateMockCage(MOCK_CAGES, a2.cageId, { code: "A9", species: "Cat", sizeGroup: "Small" });
  assert.deepEqual(byCode(renamed, "A9"), { ...a2, code: "A9", species: "Cat", sizeGroup: "Small" });
  assert.equal(byCode(renamed, "A2"), undefined);
  assert.equal(a2.code, "A2", "không sửa đối tượng cũ");
});

test("sửa chuồng sang mã của chuồng khác: 409 DUPLICATE_CAGE_CODE, danh sách giữ nguyên", () => {
  const a2 = byCode(MOCK_CAGES, "A2");
  assert.throws(() => updateMockCage(MOCK_CAGES, a2.cageId, { code: "B3", species: "Dog", sizeGroup: "Medium" }), isDuplicate);
  assert.deepEqual(updateMockCage(MOCK_CAGES, "khong-co", { code: "Z1" }), MOCK_CAGES);
});

test("ngừng sử dụng và mở lại: chỉ đổi isActive; sức chứa giảm rồi tăng lại", () => {
  const a1 = byCode(MOCK_CAGES, "A1");
  const stopped = setMockCageActive(MOCK_CAGES, a1.cageId, false);
  assert.equal(byCode(stopped, "A1").isActive, false);
  assert.deepEqual(summarizeCages(stopped), { total: 12, capacity: 10, occupied: 3, occupiedCodes: ["A2", "B1", "D2"], empty: 7, inactive: 2 });
  const reopened = setMockCageActive(stopped, a1.cageId, true);
  assert.deepEqual(reopened, MOCK_CAGES);
  const a4 = byCode(MOCK_CAGES, "A4");
  assert.equal(byCode(setMockCageActive(MOCK_CAGES, a4.cageId, true), "A4").isActive, true);
  assert.equal(a1.isActive, true, "không sửa đối tượng cũ");
  assert.deepEqual(setMockCageActive(MOCK_CAGES, "khong-co", false), MOCK_CAGES);
});

test("luật nhập chuồng: mã bắt buộc, tối đa 20 ký tự; loài và nhóm bắt buộc", () => {
  assert.equal(validateCode(""), FORM_MESSAGES.codeRequired);
  assert.equal(validateCode("   "), FORM_MESSAGES.codeRequired);
  assert.equal(validateCode("A".repeat(20)), true);
  assert.equal(validateCode(` ${"A".repeat(20)} `), true);
  assert.equal(validateCode("A".repeat(21)), FORM_MESSAGES.codeTooLong);
  assert.equal(validateSpecies(""), FORM_MESSAGES.speciesRequired);
  assert.equal(validateSpecies("Dog"), true);
  assert.equal(validateSizeGroup(""), FORM_MESSAGES.sizeGroupRequired);
  assert.equal(validateSizeGroup("Large"), true);
  assert.deepEqual(FORM_MESSAGES.codeDuplicate, "Mã chuồng đã tồn tại.");
});

test("form chuồng: thêm mới để trống chưa chọn; sửa lấy giá trị hiện có; request chỉ gồm mã, loài, nhóm", () => {
  assert.deepEqual(createCageFormValues(), { code: "", species: "", sizeGroup: "" });
  assert.deepEqual(createCageFormValues(byCode(MOCK_CAGES, "D2")), { code: "D2", species: "GuineaPig", sizeGroup: "Large" });
  assert.deepEqual(toCageRequest({ code: " C3 ", species: "Rabbit", sizeGroup: "Small" }), { code: "C3", species: "Rabbit", sizeGroup: "Small" });
  assert.throws(() => toCageRequest({ code: "X", species: "", sizeGroup: "Small" }), /Chưa chọn/);
  assert.throws(() => toCageRequest({ code: "X", species: "Dog", sizeGroup: "" }), /Chưa chọn/);
});

test("nhóm kích cỡ theo loài: chuột lang chỉ Nhỏ, Lớn; đổi loài làm nhóm không còn phù hợp thì bỏ chọn", () => {
  assert.deepEqual(SPECIES_SIZE_GROUPS.GuineaPig, ["Small", "Large"]);
  for (const species of ["Dog", "Cat", "Rabbit"]) assert.deepEqual(SPECIES_SIZE_GROUPS[species], ["Small", "Medium", "Large"]);
  assert.equal(resolveSizeGroup("GuineaPig", "Medium"), "");
  assert.equal(resolveSizeGroup("GuineaPig", "Large"), "Large");
  assert.equal(resolveSizeGroup("Cat", "Medium"), "Medium");
  assert.equal(resolveSizeGroup("", "Medium"), "Medium");
  assert.equal(resolveSizeGroup("Dog", ""), "");
  assert.deepEqual(getSizeGroupOptions(""), ["Small", "Medium", "Large"]);
  assert.deepEqual(getSizeGroupOptions("GuineaPig"), ["Small", "Large"]);
  assert.deepEqual(getSizeGroupOptions("Dog"), ["Small", "Medium", "Large"]);
  assert.ok(isSpecies("Rabbit") && !isSpecies("Hamster") && !isSpecies(""));
});

test("11 dòng giá theo thứ tự UI demo: Chó, Mèo, Thỏ đủ 3 nhóm, Chuột lang chỉ Nhỏ và Lớn", () => {
  assert.equal(PRICING_SLOTS.length, 11);
  assert.deepEqual(PRICING_SLOTS.map((slot) => `${slot.species}/${slot.sizeGroup}`), [
    "Dog/Small", "Dog/Medium", "Dog/Large", "Cat/Small", "Cat/Medium", "Cat/Large",
    "Rabbit/Small", "Rabbit/Medium", "Rabbit/Large", "GuineaPig/Small", "GuineaPig/Large",
  ]);
  assert.deepEqual(MOCK_HOTEL_PRICING.pricing.map((row) => `${row.species}/${row.sizeGroup}`), PRICING_SLOTS.map((slot) => `${slot.species}/${slot.sizeGroup}`));
});

test("form giá: giá trị ban đầu theo UI demo, có dấu phân nhóm; gửi đi đúng số nguyên và đúng khóa openapi", () => {
  const values = createHotelPricingFormValues(MOCK_HOTEL_PRICING);
  assert.equal(values.rows.length, 11);
  assert.deepEqual(values.rows[0], { pricePerNight: "180.000", foodPerNight: "40.000" });
  assert.deepEqual(values.rows[10], { pricePerNight: "100.000", foodPerNight: "25.000" });
  assert.equal(values.lateFeePerBlock, "50.000");
  assert.deepEqual(findPricingProblems(values.rows), []);
  assert.equal(validateLateFee(values.lateFeePerBlock), true);
  assert.deepEqual(toHotelPricingRequest(values), MOCK_HOTEL_PRICING);
  const edited = { ...values, rows: values.rows.map((row, index) => (index === 4 ? { pricePerNight: "175000", foodPerNight: "45,000" } : row)), lateFeePerBlock: "0" };
  const request = toHotelPricingRequest(edited);
  assert.deepEqual(request.pricing[4], { species: "Cat", sizeGroup: "Medium", pricePerNight: 175000, foodPerNight: 45000 });
  assert.equal(request.lateFeePerBlock, 0);
  assert.deepEqual(Object.keys(request).sort(), ["lateFeePerBlock", "pricing"]);
  assert.deepEqual(Object.keys(request.pricing[0]).sort(), ["foodPerNight", "pricePerNight", "sizeGroup", "species"]);
});

test("giá thiếu dòng từ server: dòng đó để trống và bị báo thiếu", () => {
  const values = createHotelPricingFormValues({ pricing: MOCK_HOTEL_PRICING.pricing.slice(0, 10), lateFeePerBlock: 50000 });
  assert.deepEqual(values.rows[10], { pricePerNight: "", foodPerNight: "" });
  assert.deepEqual(findPricingProblems(values.rows).map((problem) => problem.message), ["Thiếu giá chỗ ở hoặc giá thức ăn cho nhóm Lớn của Chuột lang."]);
});

test("luật nhập giá: bắt buộc, số nguyên ≥ 0, tối đa 12 chữ số; “1.5” không bị đọc thành 15", () => {
  const rows = createHotelPricingFormValues(MOCK_HOTEL_PRICING).rows;
  const withRow = (index, row) => rows.map((item, i) => (i === index ? row : item));
  assert.deepEqual(findPricingProblems(withRow(4, { pricePerNight: "", foodPerNight: "40.000" })).map((p) => p.message), ["Thiếu giá chỗ ở hoặc giá thức ăn cho nhóm Vừa của Mèo."]);
  assert.deepEqual(findPricingProblems(withRow(1, { pricePerNight: "220.000", foodPerNight: "  " })).map((p) => p.message), ["Thiếu giá chỗ ở hoặc giá thức ăn cho nhóm Vừa của Chó."]);
  for (const bad of ["abc", "-5", "1.5", "12.34", "1e3", "1 2", "9999999999999"]) {
    assert.deepEqual(
      findPricingProblems(withRow(6, { pricePerNight: bad, foodPerNight: "25.000" })).map((p) => p.message),
      ["Giá phải là số nguyên từ 0 trở lên (nhóm Nhỏ của Thỏ)."],
      bad,
    );
  }
  assert.deepEqual(findPricingProblems(withRow(0, { pricePerNight: "0", foodPerNight: "0" })), []);
  assert.deepEqual(findPricingProblems(withRow(0, { pricePerNight: "999.999.999.999", foodPerNight: "1" })), []);
  assert.equal(findPricingProblems([]).length, 11);
});

test("luật nhập phí trả muộn: bắt buộc, số nguyên ≥ 0 (0 hợp lệ)", () => {
  assert.equal(validateLateFee(""), FORM_MESSAGES.lateFeeRequired);
  assert.equal(validateLateFee("  "), FORM_MESSAGES.lateFeeRequired);
  assert.equal(validateLateFee("0"), true);
  assert.equal(validateLateFee("50.000"), true);
  for (const bad of ["-1", "50.5", "abc", "5 0"]) assert.equal(validateLateFee(bad), FORM_MESSAGES.lateFeeInvalid, bad);
});

test("parseMoneyInput: chỉ nhận số nguyên, bỏ dấu phân nhóm ba chữ số", () => {
  for (const [text, value] of [["0", 0], ["180000", 180000], ["180.000", 180000], ["180,000", 180000], ["1.250.000", 1250000], [" 50.000 ", 50000]]) {
    assert.equal(parseMoneyInput(text), value, text);
  }
  for (const text of ["", " ", "1.5", "1,5", "12.34", "1.2345", "-1", "5đ", "1.000,000"]) assert.equal(parseMoneyInput(text), null, text);
});
