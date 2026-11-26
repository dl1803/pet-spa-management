// tests/appointment-evidence.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EvidencePhotos } from "../features/appointments/components/evidence-photos.tsx";
import { describeSpaAppointment, findMockSpaAppointment, formatPhotoStamp, pickPhoto } from "../features/appointments/evidence.ts";

const count = (html, pattern) => (html.match(pattern) ?? []).length;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const photo = (photoId, kind, uploadedAt) => ({ photoId, kind, url: `data:image/svg+xml,${photoId}`, uploadedAt });
const BONG = "5f1c0405-7e44-4c0a-9d21-0a1b2c3d4e00";
const NAU = "5f1c0407-7e44-4c0a-9d21-0a1b2c3d4e00";
const GAO = "5f1c03fc-7e44-4c0a-9d21-0a1b2c3d4e00";
const CÔM_HOTEL = "5f1c0402-7e44-4c0a-9d21-0a1b2c3d4e00";

test("pickPhoto: chọn ảnh theo loại, trùng loại lấy ảnh tải lên sau cùng, không có thì null", () => {
  const photos = [photo("a", "Before", "2026-10-06T08:00:00+07:00"), photo("b", "Before", "2026-10-06T09:00:00+07:00")];
  assert.equal(pickPhoto(photos, "Before").photoId, "b");
  assert.equal(pickPhoto(photos, "After"), null);
  assert.equal(pickPhoto([], "Before"), null);
});

test("formatPhotoStamp: giờ và ngày theo múi giờ cửa hàng", () => {
  assert.equal(formatPhotoStamp("2026-10-06T09:10:00+07:00"), "09:10, 06/10");
  assert.equal(formatPhotoStamp("2026-10-05T23:10:00Z"), "06:10, 06/10");
});

test("findMockSpaAppointment: tra lịch spa; lịch lưu trú và ID lạ không có", () => {
  const nau = findMockSpaAppointment(NAU);
  assert.equal(nau.appointment.petName, "Nâu");
  assert.equal(nau.species, "Dog");
  assert.equal(nau.photos.length, 1);
  assert.equal(findMockSpaAppointment(BONG).photos.length, 0);
  assert.equal(findMockSpaAppointment(GAO).photos.length, 2);
  assert.equal(findMockSpaAppointment(CÔM_HOTEL), null);
  assert.equal(findMockSpaAppointment("khong-co"), null);
});

test("describeSpaAppointment: mã, khách, thời gian và nhân viên; thiếu phần nào bỏ phần đó", () => {
  const { appointment } = findMockSpaAppointment(BONG);
  assert.equal(describeSpaAppointment(appointment, "LH-5F1C0405"), "LH-5F1C0405. Trần Minh Anh. Thứ ba 06/10/2026, 09:00 – 11:00. Nhân viên Hạnh.");
  assert.equal(
    describeSpaAppointment({ ...appointment, customerName: undefined, staff: [], slotStart: null }, "LH-5F1C0405"),
    "LH-5F1C0405.",
  );
});

test("EvidencePhotos: có ảnh trước, chưa có ảnh sau → ảnh Trước + ô trống Chưa có ảnh sau; nhãn Chỉ xem, không có nút tải lên", () => {
  const html = render(EvidencePhotos, { photos: findMockSpaAppointment(NAU).photos, petName: "Nâu" });
  assert.ok(html.includes("Ảnh minh chứng") && html.includes("Chỉ xem"));
  assert.equal(count(html, /<img /g), 1);
  assert.ok(html.includes('alt="Ảnh trước chăm sóc của Nâu"') && html.includes(">Trước</span>") && html.includes("09:10, 06/10"));
  assert.ok(html.includes("Chưa có ảnh sau") && html.includes("Nhân viên spa tải lên khi xong."));
  assert.equal(count(html, /<button|<input|type="file"/g), 0);
});

test("EvidencePhotos: đủ 2 ảnh thì không có ô trống; chưa có ảnh nào thì 2 ô trống", () => {
  const both = render(EvidencePhotos, { photos: findMockSpaAppointment(GAO).photos, petName: "Gạo" });
  assert.equal(count(both, /<img /g), 2);
  assert.ok(both.includes('alt="Ảnh sau chăm sóc của Gạo"') && both.includes(">Sau</span>"));
  assert.ok(!both.includes("Chưa có ảnh"));
  const none = render(EvidencePhotos, { photos: [], petName: "Bông" });
  assert.equal(count(none, /<img /g), 0);
  assert.ok(none.includes("Chưa có ảnh trước") && none.includes("Chưa có ảnh sau"));
});
