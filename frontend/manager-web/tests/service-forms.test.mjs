import assert from "node:assert/strict";
import test from "node:test";
import {
  PRICING_SLOTS,
  countServices,
  createFormValues,
  findPricingProblems,
  getMinPrice,
  getPricingSpecies,
  normalizeInteger,
  toServiceRequest,
} from "../features/services/forms.ts";
import { MOCK_SERVICES, MOCK_SLOT_TIMES, buildMockService } from "../features/services/mock-data.ts";

const cutTia = MOCK_SERVICES.find((service) => service.name === "Cắt tỉa lông");

test("dữ liệu mô phỏng khớp bảng MW-06: 5 đang cung cấp, 1 đã ngừng, giá từ và mốc muộn nhất", () => {
  assert.deepEqual(countServices(MOCK_SERVICES), { active: 5, inactive: 1 });
  assert.deepEqual(
    MOCK_SERVICES.map((service) => [service.name, getMinPrice(service.pricing), service.latestStartTime, service.isActive]),
    [
      ["Tắm & sấy lông", 90000, "19:00", true],
      ["Cắt tỉa lông", 120000, "18:00", true],
      ["Vệ sinh tai & cắt móng", 40000, "19:00", true],
      ["Gỡ rối & khử mùi lông", 80000, "18:00", true],
      ["Gói spa thư giãn", 300000, "17:00", true],
      ["Nhuộm lông tạo màu", 250000, "17:00", false],
    ],
  );
  assert.deepEqual(getPricingSpecies(MOCK_SERVICES[0].pricing), ["Dog", "Cat", "Rabbit", "GuineaPig"]);
  assert.deepEqual(getPricingSpecies(MOCK_SERVICES[5].pricing), ["Dog"]);
  for (const service of MOCK_SERVICES) {
    assert.ok(MOCK_SLOT_TIMES.includes(service.latestStartTime));
    assert.equal(service.pricing.filter((row) => row.species === "GuineaPig" && row.sizeGroup === "Medium").length, 0);
  }
});

test("11 ô loài × nhóm; chuột lang chỉ có Nhỏ và Lớn", () => {
  assert.equal(PRICING_SLOTS.length, 11);
  assert.deepEqual(
    PRICING_SLOTS.filter((slot) => slot.species === "GuineaPig").map((slot) => slot.sizeGroup),
    ["Small", "Large"],
  );
});

test("normalizeInteger bỏ dấu chấm ngăn nghìn và khoảng trắng, từ chối ký tự khác", () => {
  assert.equal(normalizeInteger("120.000"), "120000");
  assert.equal(normalizeInteger(" 60 "), "60");
  for (const bad of ["", "abc", "12,5", "-5", "1e3"]) assert.equal(normalizeInteger(bad), null, bad);
});

test("sửa dịch vụ: form lấy đúng loài, giá hiển thị có dấu chấm, số nhân viên", () => {
  const values = createFormValues(cutTia);
  assert.equal(values.name, "Cắt tỉa lông");
  assert.equal(values.latestStartTime, "18:00");
  assert.deepEqual(values.species, ["Dog", "Cat"]);
  assert.equal(values.rows.length, 11);
  assert.deepEqual(values.rows[0], { price: "120.000", durationMinutes: "60", staffRequired: "1" });
  assert.deepEqual(values.rows[2], { price: "200.000", durationMinutes: "90", staffRequired: "2" });
  assert.deepEqual(values.rows[6], { price: "", durationMinutes: "", staffRequired: "1" });
});

test("thêm dịch vụ: form trống, chưa chọn loài, chưa có vấn đề giá", () => {
  const values = createFormValues();
  assert.equal(values.name, "");
  assert.equal(values.latestStartTime, "");
  assert.deepEqual(values.species, []);
  assert.deepEqual(findPricingProblems(values), []);
});

test("sửa rồi gửi lại không đổi: yêu cầu giống dữ liệu gốc, đúng thứ tự loài và nhóm", () => {
  const request = toServiceRequest(createFormValues(cutTia));
  assert.deepEqual(request, {
    name: cutTia.name,
    description: cutTia.description,
    latestStartTime: cutTia.latestStartTime,
    pricing: cutTia.pricing,
  });
});

test("ô giá của loài đã bỏ chọn không được gửi; mô tả trống thì không gửi", () => {
  const values = createFormValues(cutTia);
  values.species = ["Cat"];
  values.description = "  ";
  values.name = "  Cắt tỉa lông  ";
  const request = toServiceRequest(values);
  assert.equal(request.name, "Cắt tỉa lông");
  assert.ok(!("description" in request));
  assert.deepEqual(
    request.pricing.map((row) => row.species),
    ["Cat", "Cat", "Cat"],
  );
});

test("thiếu giá hoặc thời lượng báo đúng nhóm và loài; loài không chọn thì bỏ qua", () => {
  const values = createFormValues(cutTia);
  values.rows[4].price = "";
  assert.deepEqual(
    findPricingProblems(values).map((problem) => problem.message),
    ["Thiếu giá/thời lượng cho nhóm Vừa của Mèo."],
  );
  values.species = ["Dog"];
  assert.deepEqual(findPricingProblems(values), []);
});

test("giá hoặc thời lượng không hợp lệ bị báo; giá 0 hợp lệ", () => {
  const values = createFormValues(cutTia);
  values.rows[0].durationMinutes = "0";
  values.rows[1].price = "12,5";
  values.rows[2].price = "0";
  values.rows[3].price = "1".repeat(13);
  const problems = findPricingProblems(values);
  assert.deepEqual(
    problems.map((problem) => [problem.species, problem.sizeGroup]),
    [["Dog", "Small"], ["Dog", "Medium"], ["Cat", "Small"]],
  );
});

test("buildMockService giữ id và trạng thái; mô tả bị xóa thì thành null", () => {
  const request = toServiceRequest({ ...createFormValues(cutTia), description: "" });
  const updated = buildMockService(request, { serviceId: cutTia.serviceId, isActive: false });
  assert.equal(updated.serviceId, cutTia.serviceId);
  assert.equal(updated.isActive, false);
  assert.equal(updated.description, null);
});
