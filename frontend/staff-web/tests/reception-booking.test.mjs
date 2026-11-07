import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HotelAvailabilityNotice } from "../features/reception-booking/components/hotel-availability-notice.tsx";
import { HotelBookingSummary } from "../features/reception-booking/components/hotel-booking-summary.tsx";
import { HotelStayForm } from "../features/reception-booking/components/hotel-stay-form.tsx";
import { PetChoiceList } from "../features/reception-booking/components/pet-choice-list.tsx";
import { ServingCustomerBar } from "../features/reception-booking/components/serving-customer-bar.tsx";
import {
  describeAvailable,
  formatNightList,
  getInitialPetId,
  getInitials,
  getStay,
  isCheckOutNotAfter,
  isNoCapacityError,
  parseBookingType,
  toHotelBookingRequest,
  validateCheckOutDate,
} from "../features/reception-booking/forms.ts";
import { findMockCustomer, getMockPets, MOCK_HOTEL_PRICING } from "../features/reception-booking/mock-data.ts";
import { mockCreateHotelAppointment, mockGetHotelAvailability } from "../features/reception-booking/mock-hotel.ts";

const CUSTOMER = findMockCustomer("c2000000-0000-4000-8000-000000000001");
const PETS = getMockPets(CUSTOMER.customerId);
const BAP = PETS[0];
const FULL_VALUES = { checkInDate: "2026-10-08", checkInTime: "09:00", checkOutDate: "2026-10-10", checkOutTime: "18:00" };
const STAY = { from: "2026-10-08T09:00:00+07:00", to: "2026-10-10T18:00:00+07:00" };

test("getStay: chỉ có kết quả khi đủ 4 ô và ngày trả sau ngày nhận", () => {
  assert.deepEqual(getStay(FULL_VALUES), STAY);
  assert.equal(getStay({ ...FULL_VALUES, checkOutTime: "" }), null);
  assert.equal(getStay({ ...FULL_VALUES, checkInDate: "" }), null);
  assert.equal(getStay({ ...FULL_VALUES, checkOutDate: "2026-10-08" }), null);
  assert.equal(getStay({ ...FULL_VALUES, checkOutDate: "2026-10-07" }), null);
});

test("kiểm tra ngày trả: bắt buộc và phải sau ngày nhận", () => {
  assert.equal(validateCheckOutDate("", "2026-10-08"), "Vui lòng chọn ngày trả.");
  assert.equal(validateCheckOutDate("2026-10-08", "2026-10-08"), "Ngày trả phải sau ngày nhận.");
  assert.equal(validateCheckOutDate("2026-10-09", "2026-10-08"), true);
  assert.equal(validateCheckOutDate("2026-10-09", ""), true);
  assert.equal(isCheckOutNotAfter({ ...FULL_VALUES, checkOutDate: "2026-10-08" }), true);
  assert.equal(isCheckOutNotAfter({ ...FULL_VALUES, checkOutDate: "" }), false);
});

test("hàm phụ: chữ cái đầu, tab, chọn thú cưng, danh sách đêm, yêu cầu, câu thông báo còn chỗ", () => {
  assert.equal(getInitials("Ngô Thanh Bình"), "TB");
  assert.equal(parseBookingType("Hotel"), "Hotel");
  assert.equal(parseBookingType("x"), "Spa");
  assert.equal(parseBookingType(null), "Spa");
  assert.equal(getInitialPetId(PETS, PETS[1].petId), PETS[1].petId);
  assert.equal(getInitialPetId(PETS, "khong-co"), PETS[0].petId);
  assert.equal(getInitialPetId([], null), "");
  assert.equal(formatNightList(STAY.from, 1), "08/10");
  assert.equal(formatNightList(STAY.from, 2), "08/10 và 09/10");
  assert.equal(formatNightList(STAY.from, 3), "08/10, 09/10 và 10/10");
  assert.deepEqual(toHotelBookingRequest(CUSTOMER.customerId, BAP.petId, STAY), {
    petId: BAP.petId,
    plannedCheckIn: STAY.from,
    plannedCheckOut: STAY.to,
    customerId: CUSTOMER.customerId,
  });
  assert.equal(describeAvailable(BAP, STAY, 2), "Còn chuồng phù hợp cho chó nhóm Vừa trong cả 2 đêm 08/10 và 09/10.");
  assert.equal(isNoCapacityError(new Error("x")), false);
});

test("dữ liệu mô phỏng: khách, thú cưng và giá khớp nhau", () => {
  assert.equal(findMockCustomer("khong-co"), null);
  assert.equal(findMockCustomer(null), null);
  assert.equal(PETS.length, 3);
  assert.equal(getMockPets("c2000000-0000-4000-8000-000000000002").length, 0);
  for (const pet of PETS) {
    assert.ok(MOCK_HOTEL_PRICING.some((row) => row.species === pet.species && row.sizeGroup === pet.sizeGroup));
  }
});

test("mock kiểm tra còn chỗ: còn chỗ, hết chỗ từ 7 đêm, lỗi khi nhận thứ bảy", async () => {
  const ok = await mockGetHotelAvailability({ petId: BAP.petId, from: STAY.from, to: STAY.to });
  assert.deepEqual(ok, { available: true, nights: 2, estimatedAmount: 540000 });

  const full = await mockGetHotelAvailability({
    petId: BAP.petId,
    from: "2026-10-08T09:00:00+07:00",
    to: "2026-10-15T18:00:00+07:00",
  });
  assert.equal(full.available, false);
  assert.equal(full.nights, 7);

  await assert.rejects(
    mockGetHotelAvailability({ petId: BAP.petId, from: "2026-10-10T09:00:00+07:00", to: "2026-10-12T18:00:00+07:00" }),
    (error) => error.status === 400,
  );
});

test("mock tạo lịch lưu trú: thành công và từng lỗi theo giờ trả", async () => {
  const request = toHotelBookingRequest(CUSTOMER.customerId, BAP.petId, STAY);
  const created = await mockCreateHotelAppointment(request);
  assert.equal(created.status, "Pending");
  assert.equal(created.nights, 2);
  assert.equal(created.estimatedAmount, 540000);

  const withCheckOut = (time) =>
    toHotelBookingRequest(CUSTOMER.customerId, BAP.petId, { from: STAY.from, to: `2026-10-10T${time}:00+07:00` });
  await assert.rejects(mockCreateHotelAppointment(withCheckOut("11:00")), (error) => error.kind === "network");
  await assert.rejects(mockCreateHotelAppointment(withCheckOut("15:00")), (error) => error.status === 400);
  await assert.rejects(mockCreateHotelAppointment(withCheckOut("16:00")), (error) => error.status === 429);
  await assert.rejects(mockCreateHotelAppointment(withCheckOut("17:00")), (error) => error.status === 500);

  const noCapacity = withCheckOut("12:00");
  await assert.rejects(mockCreateHotelAppointment(noCapacity), (error) => isNoCapacityError(error));
  const after = await mockGetHotelAvailability({
    petId: BAP.petId,
    from: noCapacity.plannedCheckIn,
    to: noCapacity.plannedCheckOut,
  });
  assert.equal(after.available, false);

  await assert.rejects(
    mockCreateHotelAppointment({ ...request, customerId: "c2000000-0000-4000-8000-000000000002" }),
    (error) => error.status === 400,
  );
});

test("ServingCustomerBar: chữ cái đầu, tên, số điện thoại, nút Đổi khách bị vô hiệu hóa", () => {
  const html = renderToStaticMarkup(createElement(ServingCustomerBar, { customer: CUSTOMER }));
  assert.match(html, />TB</);
  assert.match(html, /Ngô Thanh Bình/);
  assert.match(html, /0962345118/);
  assert.match(html, /<button[^>]*disabled[^>]*>.*Đổi khách/s);
  assert.doesNotMatch(html, /vãng lai/);
});

test("PetChoiceList: mỗi thú cưng một ô chọn, ô đang chọn được đánh dấu", () => {
  const html = renderToStaticMarkup(
    createElement(PetChoiceList, { pets: PETS, selectedPetId: PETS[1].petId, onSelect: () => {} }),
  );
  assert.equal((html.match(/type="radio"/g) ?? []).length, 3);
  assert.equal((html.match(/checked=""/g) ?? []).length, 1);
  assert.match(html, /Chó Corgi, 11,0 kg, nhóm Vừa, khó tính, dữ/);
  assert.match(html, /<legend class="sr-only">Chọn thú cưng<\/legend>/);
});

test("HotelAvailabilityNotice: từng trạng thái", () => {
  const render = (state) => renderToStaticMarkup(createElement(HotelAvailabilityNotice, { state }));
  assert.match(render({ kind: "idle" }), /^<div aria-live="polite" class="empty:hidden"><\/div>$/);
  assert.match(render({ kind: "checking" }), /Đang kiểm tra chỗ…/);
  const available = render({ kind: "available", message: "Còn chuồng phù hợp." });
  assert.match(available, /data-tone="success"/);
  assert.match(available, /Còn chuồng phù hợp\./);
  const full = render({ kind: "full" });
  assert.match(full, /data-tone="danger"/);
  assert.match(full, /Hết chỗ/);
  assert.match(full, /Hết chỗ trong thời gian này, vui lòng chọn ngày khác\./);
  const error = render({ kind: "error", error: new Error("x"), onRetry: () => {} });
  assert.match(error, /Thử lại/);
});

test("HotelBookingSummary: giá, công thức, khóa nút kèm lý do và trạng thái gửi", () => {
  const render = (props) =>
    renderToStaticMarkup(
      createElement(HotelBookingSummary, {
        pet: BAP,
        checkInText: "T5 08/10, 09:00",
        checkOutText: "T7 10/10, 18:00",
        quote: { nights: 2, estimatedAmount: 540000 },
        rate: MOCK_HOTEL_PRICING[0],
        lockReason: null,
        isSubmitting: false,
        submitError: null,
        ...props,
      }),
    );
  const html = render({});
  assert.match(html, /Chó Corgi, nhóm Vừa/);
  assert.match(html, /T5 08\/10, 09:00/);
  assert.match(html, /540\.000đ/);
  assert.match(html, /2 × \(220\.000đ \+ 50\.000đ\)/);
  assert.match(html, /Lịch tạo ra ở trạng thái Chờ xác nhận\./);
  assert.doesNotMatch(html, /<button[^>]*type="submit"[^>]*\sdisabled(?=[>\s=])/);

  const locked = render({ lockReason: "Hết chỗ trong thời gian đã chọn." });
  assert.match(locked, /<button[^>]*type="submit"[^>]*\sdisabled(?=[>\s=])/);
  assert.match(locked, /aria-describedby="hotel-booking-lock-reason"/);
  assert.match(locked, /id="hotel-booking-lock-reason"[^>]*>.*Hết chỗ trong thời gian đã chọn\./s);

  const empty = render({ quote: null, rate: null, checkInText: null, checkOutText: null });
  assert.doesNotMatch(empty, /Tiền lưu trú/);
  assert.match(empty, /—/);

  const sending = render({ isSubmitting: true });
  assert.match(sending, /aria-busy="true"/);
  assert.match(sending, /Đang gửi…/);
  assert.match(render({ submitError: new Error("x") }), /role="alert"/);
});

test("HotelStayForm: 4 ô bắt buộc, lỗi dưới ô và kết quả kiểm tra", () => {
  const register = (name) => ({ name, onChange: () => {}, onBlur: () => {}, ref: () => {} });
  const html = renderToStaticMarkup(
    createElement(HotelStayForm, {
      register,
      errors: { checkOutDate: { type: "validate", message: "Ngày trả phải sau ngày nhận." } },
      notice: { kind: "available", message: "Còn chuồng phù hợp." },
      onCheckInDateChange: () => {},
    }),
  );
  for (const label of ["Ngày nhận", "Giờ nhận", "Ngày trả", "Giờ trả"]) assert.match(html, new RegExp(label));
  assert.equal((html.match(/type="date"/g) ?? []).length, 2);
  assert.equal((html.match(/type="time"/g) ?? []).length, 2);
  assert.equal((html.match(/aria-required="true"/g) ?? []).length, 4);
  assert.match(html, /id="hotel-check-out-date"[^>]*aria-invalid="true"/);
  assert.match(html, /Ngày trả phải sau ngày nhận\./);
  assert.match(html, /Còn chuồng phù hợp\./);
  assert.match(html, /Lưu trú không kèm dịch vụ spa/);
});
