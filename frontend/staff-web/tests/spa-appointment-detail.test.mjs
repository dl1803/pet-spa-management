import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "../lib/api/errors.ts";
import { AppointmentDetailHeader } from "../features/spa-appointments/components/appointment-detail-header.tsx";
import { PetProfileCard } from "../features/spa-appointments/components/pet-profile-card.tsx";
import { buildProfileRows, getPrimaryAction } from "../features/spa-appointments/detail.ts";

const PET = {
  petId: "p1",
  customerId: "c1",
  name: "Mít",
  species: "Dog",
  breed: "Phốc sóc",
  temperament: "Normal",
  weightKg: 2.8,
  heightCm: 22,
  coatNote: "Lông dài, màu vàng cam",
  notes: "Hay run khi gặp người lạ.",
  sizeGroup: "Small",
  isActive: true,
};

const appointment = (status) => ({
  appointmentId: "a1b2c3d4-0000-4000-8000-000000000001",
  type: "Spa",
  customerId: "c1",
  petId: "p1",
  petName: "Mít",
  status,
  sizeGroup: "Small",
  slotStart: "2026-11-23T05:00:00Z",
  slotEnd: "2026-11-23T06:00:00Z",
  createdAt: "2026-11-20T08:00:00Z",
  updatedAt: "2026-11-20T08:00:00Z",
  services: [],
  staff: [],
});

test("getPrimaryAction: Confirmed -> locked, Received/InProgress -> open, các trạng thái khác -> none", () => {
  assert.equal(getPrimaryAction("Confirmed"), "locked");
  assert.equal(getPrimaryAction("Received"), "open");
  assert.equal(getPrimaryAction("InProgress"), "open");
  assert.equal(getPrimaryAction("Pending"), "none");
  assert.equal(getPrimaryAction("InStay"), "none");
  assert.equal(getPrimaryAction("Completed"), "none");
  assert.equal(getPrimaryAction("Cancelled"), "none");
});

test("buildProfileRows(PET): 7 dòng đúng thứ tự nhãn và giá trị", () => {
  const rows = buildProfileRows(PET);
  assert.equal(rows.length, 7);
  assert.deepEqual(
    rows.map((r) => r.label),
    [
      "Loài, giống",
      "Cân nặng khai báo",
      "Chiều cao vai",
      "Nhóm kích cỡ",
      "Tính cách",
      "Đặc điểm lông",
      "Ghi chú",
    ],
  );
  assert.deepEqual(
    rows.map((r) => r.value),
    [
      "Chó Phốc sóc",
      "2,8 kg",
      "22 cm",
      "Nhỏ",
      "Bình thường",
      "Lông dài, màu vàng cam",
      "Hay run khi gặp người lạ.",
    ],
  );

  const fallbackRows = buildProfileRows({ ...PET, heightCm: null, coatNote: " ", notes: null });
  assert.equal(fallbackRows[2].value, "—");
  assert.equal(fallbackRows[5].value, "—");
  assert.equal(fallbackRows[6].value, "—");
});

test("AppointmentDetailHeader với Confirmed: hiển thị đúng thông tin, nút disabled kèm lý do", () => {
  const html = renderToStaticMarkup(
    React.createElement(AppointmentDetailHeader, {
      appointment: appointment("Confirmed"),
      pet: PET,
      petFailed: false,
    }),
  );
  assert.ok(html.includes("Lịch spa của Mít"));
  assert.ok(html.includes("Đã xác nhận"));
  assert.ok(html.includes("LH-A1B2C3D4"));
  assert.ok(html.includes("Chờ lễ tân tiếp nhận thú cưng."));
  assert.ok(html.includes('disabled=""'));
  assert.ok(!html.includes('href="/lich-hen/a1b2c3d4-0000-4000-8000-000000000001/thuc-hien"'));
  assert.ok(html.includes("12:00 – 13:00"));
});

test("AppointmentDetailHeader với Received và InProgress: có liên kết Mở, không disabled", () => {
  for (const status of ["Received", "InProgress"]) {
    const html = renderToStaticMarkup(
      React.createElement(AppointmentDetailHeader, {
        appointment: appointment(status),
        pet: PET,
        petFailed: false,
      }),
    );
    assert.ok(html.includes('href="/lich-hen/a1b2c3d4-0000-4000-8000-000000000001/thuc-hien"'));
    assert.ok(html.includes("Mở màn hình thực hiện"));
    assert.ok(!html.includes('disabled=""'));
    assert.ok(!html.includes("Chờ lễ tân tiếp nhận"));
  }
});

test("AppointmentDetailHeader với Completed và Cancelled: không có nút Mở màn hình thực hiện", () => {
  for (const status of ["Completed", "Cancelled"]) {
    const html = renderToStaticMarkup(
      React.createElement(AppointmentDetailHeader, {
        appointment: appointment(status),
        pet: PET,
        petFailed: false,
      }),
    );
    assert.ok(!html.includes("Mở màn hình thực hiện"));
  }
});

test("AppointmentDetailHeader khi pet là undefined: petFailed=false có animate-pulse, petFailed=true không có animate-pulse", () => {
  const pendingHtml = renderToStaticMarkup(
    React.createElement(AppointmentDetailHeader, {
      appointment: appointment("Confirmed"),
      pet: undefined,
      petFailed: false,
    }),
  );
  assert.ok(pendingHtml.includes("animate-pulse"));
  assert.ok(pendingHtml.includes("Lịch spa của Mít"));

  const failedHtml = renderToStaticMarkup(
    React.createElement(AppointmentDetailHeader, {
      appointment: appointment("Confirmed"),
      pet: undefined,
      petFailed: true,
    }),
  );
  assert.ok(!failedHtml.includes("animate-pulse"));
  assert.ok(failedHtml.includes("Lịch spa của Mít"));
});

test("PetProfileCard: render đúng theo trạng thái pet, pending, error", () => {
  const readyHtml = renderToStaticMarkup(
    React.createElement(PetProfileCard, {
      pet: PET,
      isPending: false,
      error: null,
    }),
  );
  assert.ok(readyHtml.includes("Hồ sơ thú cưng"));
  assert.ok(readyHtml.includes("Chỉ xem"));
  assert.ok(readyHtml.includes("Loài, giống"));
  assert.ok(readyHtml.includes("Cân nặng khai báo"));
  assert.ok(readyHtml.includes("Chiều cao vai"));
  assert.ok(readyHtml.includes("Nhóm kích cỡ"));
  assert.ok(readyHtml.includes("Tính cách"));
  assert.ok(readyHtml.includes("Đặc điểm lông"));
  assert.ok(readyHtml.includes("Ghi chú"));

  const pendingHtml = renderToStaticMarkup(
    React.createElement(PetProfileCard, {
      pet: undefined,
      isPending: true,
      error: null,
    }),
  );
  assert.ok(pendingHtml.includes("animate-pulse"));
  assert.ok(!pendingHtml.includes("Cân nặng khai báo"));

  const errorHtml = renderToStaticMarkup(
    React.createElement(PetProfileCard, {
      pet: undefined,
      isPending: false,
      error: new ApiError({ kind: "http", status: 500 }),
    }),
  );
  assert.ok(errorHtml.includes('role="alert"'));
  assert.ok(errorHtml.includes("Có lỗi xảy ra, vui lòng thử lại sau."));
});
