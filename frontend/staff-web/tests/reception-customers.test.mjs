import assert from "node:assert/strict";
import test from "node:test";
import { estimateSize, getSizeGroup } from "../lib/size-estimate.ts";
import { normalizePhone, validateFullName, validateOptionalEmail, validatePhone } from "../lib/validation.ts";

test("số điện thoại: bỏ khoảng trắng, dấu chấm, gạch ngang; 10 chữ số bắt đầu bằng 0", () => {
  assert.equal(normalizePhone("0962 345-118"), "0962345118");
  assert.equal(normalizePhone("0962.345.118"), "0962345118");
  assert.equal(validatePhone(""), "Vui lòng nhập số điện thoại.");
  assert.equal(validatePhone("   "), "Vui lòng nhập số điện thoại.");
  assert.equal(validatePhone("12345"), "Số điện thoại chưa đúng định dạng.");
  assert.equal(validatePhone("1962345118"), "Số điện thoại chưa đúng định dạng.");
  assert.equal(validatePhone("0962 345 118"), true);
});

test("họ tên và email: bắt buộc, giới hạn độ dài", () => {
  assert.equal(validateFullName("  "), "Vui lòng nhập họ tên.");
  assert.equal(validateFullName("a".repeat(151)), "Họ tên tối đa 150 ký tự.");
  assert.equal(validateFullName("Ngô Thanh Bình"), true);
  assert.equal(validateOptionalEmail(""), true);
  assert.equal(validateOptionalEmail("abc"), "Email chưa đúng định dạng.");
});

test("nhóm kích cỡ dự kiến: chó lấy nhóm cao hơn giữa cân nặng và chiều cao", () => {
  const dog = estimateSize({ species: "Dog", weightKg: 11, heightCm: 30 });
  assert.equal(dog.status, "ready");
  assert.equal(dog.group, "Medium");
  assert.equal(dog.byWeight.group, "Medium");
  assert.equal(dog.byHeight.group, "Small");
  assert.equal(getSizeGroup({ species: "Dog", weightKg: 9, heightCm: 40 }), "Medium");
  assert.equal(estimateSize({ species: "Dog", weightKg: 11, heightCm: null }).status, "incomplete");
});

test("nhóm kích cỡ dự kiến: loài khác chỉ theo cân nặng; chuột lang chỉ có Nhỏ và Lớn; thiếu cân nặng thì chưa đủ dữ liệu", () => {
  assert.equal(getSizeGroup({ species: "Cat", weightKg: 4.2, heightCm: null }), "Medium");
  assert.equal(getSizeGroup({ species: "Rabbit", weightKg: 1.8, heightCm: null }), "Medium");
  assert.equal(getSizeGroup({ species: "GuineaPig", weightKg: 0.9, heightCm: null }), "Small");
  assert.equal(getSizeGroup({ species: "GuineaPig", weightKg: 1.2, heightCm: null }), "Large");
  assert.equal(getSizeGroup({ species: "Cat", weightKg: null, heightCm: null }), null);
  assert.equal(getSizeGroup({ species: "Cat", weightKg: 0, heightCm: null }), null);
});

