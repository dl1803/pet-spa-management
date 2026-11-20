import assert from "node:assert/strict";
import test from "node:test";
import {
  RESCHEDULE_MESSAGES,
  buildHotelUpdateRequest,
  buildSpaUpdateRequest,
  canRescheduleAppointment,
  createHotelRescheduleValues,
  createSpaRescheduleValues,
  isStaffSelectionComplete,
  toggleStaffId,
  validateHotelCheckInInFuture,
  validateHotelCheckOutAfterCheckIn,
  validateSpaDate,
  validateSpaSlotInFuture,
  validateSpaTime,
} from "../features/appointments/forms.ts";
import { classifyRescheduleError, isStaleAppointmentError } from "../features/appointments/intervention-error.ts";
import { ApiError } from "../lib/api/errors.ts";

const http = (status, code, detail) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });

test("canRescheduleAppointment: chỉ Pending và Confirmed khi đủ dữ liệu mới đổi được", () => {
  const baseSpa = {
    appointmentId: "a1",
    type: "Spa",
    customerId: "c1",
    petId: "p1",
    status: "Pending",
    sizeGroup: "Small",
    slotStart: "2026-11-25T09:00:00+07:00",
    services: [{ serviceId: "s1", isDone: false }],
    createdAt: "",
    updatedAt: "",
  };

  assert.equal(canRescheduleAppointment(baseSpa), true);
  assert.equal(canRescheduleAppointment({ ...baseSpa, status: "Confirmed" }), true);
  assert.equal(canRescheduleAppointment({ ...baseSpa, status: "Received" }), false);
  assert.equal(canRescheduleAppointment({ ...baseSpa, status: "InProgress" }), false);
  assert.equal(canRescheduleAppointment({ ...baseSpa, status: "InStay" }), false);
  assert.equal(canRescheduleAppointment({ ...baseSpa, status: "Completed" }), false);
  assert.equal(canRescheduleAppointment({ ...baseSpa, status: "Cancelled" }), false);

  // Thiếu dữ liệu spa
  assert.equal(canRescheduleAppointment({ ...baseSpa, slotStart: null }), false);
  assert.equal(canRescheduleAppointment({ ...baseSpa, services: [] }), false);

  const baseHotel = {
    appointmentId: "h1",
    type: "Hotel",
    customerId: "c1",
    petId: "p1",
    status: "Confirmed",
    sizeGroup: "Small",
    plannedCheckIn: "2026-11-25T09:00:00+07:00",
    plannedCheckOut: "2026-11-27T12:00:00+07:00",
    createdAt: "",
    updatedAt: "",
  };

  assert.equal(canRescheduleAppointment(baseHotel), true);
  assert.equal(canRescheduleAppointment({ ...baseHotel, plannedCheckIn: null }), false);
  assert.equal(canRescheduleAppointment({ ...baseHotel, plannedCheckOut: null }), false);
});

test("createSpaRescheduleValues và buildSpaUpdateRequest", () => {
  const spa = {
    appointmentId: "a1",
    type: "Spa",
    customerId: "c1",
    petId: "p1",
    status: "Pending",
    sizeGroup: "Small",
    slotStart: "2026-11-25T09:00:00+07:00",
    services: [{ serviceId: "s1", isDone: false }, { serviceId: "s2", isDone: false }],
    staff: [{ staffId: "st1", fullName: "Nhân viên 1", isHolding: true }],
    createdAt: "",
    updatedAt: "",
  };

  const values = createSpaRescheduleValues(spa);
  assert.equal(values.date, "2026-11-25");
  assert.equal(values.time, "09:00");
  assert.deepEqual(values.staffIds, ["st1"]);

  // Lịch Pending: không gửi staffIds dù có chọn nhân viên
  const reqPending = buildSpaUpdateRequest(spa, { ...values, time: "10:00", staffIds: ["st2"] });
  assert.equal(reqPending.petId, "p1");
  assert.equal(reqPending.slotStart, "2026-11-25T10:00:00+07:00");
  assert.deepEqual(reqPending.serviceIds, ["s1", "s2"]);
  assert.equal(reqPending.staffIds, undefined);
  assert.equal(reqPending.confirmOutOfShift, undefined);

  // Lịch Confirmed giữ nguyên nhân viên: không gửi staffIds
  const confirmedSpa = { ...spa, status: "Confirmed" };
  const reqConfirmedSame = buildSpaUpdateRequest(confirmedSpa, values);
  assert.equal(reqConfirmedSame.staffIds, undefined);

  // Lịch Confirmed đổi nhân viên: có staffIds
  const reqConfirmedChanged = buildSpaUpdateRequest(confirmedSpa, { ...values, staffIds: ["st2"] });
  assert.deepEqual(reqConfirmedChanged.staffIds, ["st2"]);

  // confirmOutOfShift
  const reqWithOutOfShift = buildSpaUpdateRequest(confirmedSpa, { ...values, staffIds: ["st2"] }, true);
  assert.equal(reqWithOutOfShift.confirmOutOfShift, true);
});

test("createHotelRescheduleValues và buildHotelUpdateRequest không có cageId", () => {
  const hotel = {
    appointmentId: "h1",
    type: "Hotel",
    customerId: "c1",
    petId: "p1",
    status: "Pending",
    sizeGroup: "Small",
    plannedCheckIn: "2026-11-25T09:00:00+07:00",
    plannedCheckOut: "2026-11-27T12:00:00+07:00",
    cageId: "cage-99",
    createdAt: "",
    updatedAt: "",
  };

  const values = createHotelRescheduleValues(hotel);
  assert.equal(values.checkInDate, "2026-11-25");
  assert.equal(values.checkInTime, "09:00");
  assert.equal(values.checkOutDate, "2026-11-27");
  assert.equal(values.checkOutTime, "12:00");

  const req = buildHotelUpdateRequest(hotel, values);
  assert.equal(req.petId, "p1");
  assert.equal(req.plannedCheckIn, "2026-11-25T09:00:00+07:00");
  assert.equal(req.plannedCheckOut, "2026-11-27T12:00:00+07:00");
  assert.equal("cageId" in req, false);
});

test("các hàm toggleStaffId và isStaffSelectionComplete", () => {
  assert.deepEqual(toggleStaffId(["st1"], "st2", 1), ["st2"]);
  assert.deepEqual(toggleStaffId(["st1"], "st2", 2), ["st1", "st2"]);
  assert.deepEqual(toggleStaffId(["st1", "st2"], "st1", 2), ["st2"]);

  assert.equal(isStaffSelectionComplete(["st1"], 1), true);
  assert.equal(isStaffSelectionComplete([], 1), false);
  assert.equal(isStaffSelectionComplete(["st1"], 2), false);
  assert.equal(isStaffSelectionComplete(["st1", "st2"], 2), true);
});

test("các hàm validation: bắt buộc, mốc ngoài SLOT_TIMES, quá khứ, ngày trả <= ngày nhận", () => {
  assert.equal(validateSpaDate(""), RESCHEDULE_MESSAGES.dateRequired);
  assert.equal(validateSpaDate("2026-11-25"), null);

  assert.equal(validateSpaTime(""), RESCHEDULE_MESSAGES.timeRequired);
  assert.equal(validateSpaTime("08:00"), RESCHEDULE_MESSAGES.slotTimeInvalid);
  assert.equal(validateSpaTime("09:00"), null);

  // Mốc quá khứ
  assert.equal(validateSpaSlotInFuture("2020-01-01", "09:00"), RESCHEDULE_MESSAGES.inPast);
  assert.equal(validateSpaSlotInFuture("2099-01-01", "09:00"), null);

  assert.equal(validateHotelCheckInInFuture("2020-01-01", "09:00"), RESCHEDULE_MESSAGES.inPast);
  assert.equal(validateHotelCheckInInFuture("2099-01-01", "09:00"), null);

  assert.equal(validateHotelCheckOutAfterCheckIn("2026-11-25", "2026-11-25"), RESCHEDULE_MESSAGES.checkOutAfterCheckIn);
  assert.equal(validateHotelCheckOutAfterCheckIn("2026-11-25", "2026-11-24"), RESCHEDULE_MESSAGES.checkOutAfterCheckIn);
  assert.equal(validateHotelCheckOutAfterCheckIn("2026-11-25", "2026-11-26"), null);
});

test("classifyRescheduleError: phân loại lỗi chính xác theo mã", () => {
  assert.deepEqual(classifyRescheduleError(http(409, "STAFF_OUT_OF_SHIFT", "Chi tiết ngoài ca"), 1), {
    kind: "out-of-shift",
    detail: "Chi tiết ngoài ca",
  });
  assert.deepEqual(classifyRescheduleError(http(409, "SLOT_FULL", "Kín"), 1), {
    kind: "field",
    field: "time",
    message: "Mốc giờ vừa kín, vui lòng chọn mốc khác.",
  });
  assert.deepEqual(classifyRescheduleError(http(409, "STAFF_CONFLICT", "Trùng"), 1), {
    kind: "field",
    field: "staffIds",
    message: "Có nhân viên đã có lịch trùng khung giờ.",
  });
  assert.deepEqual(classifyRescheduleError(http(409, "STAFF_COUNT_MISMATCH", "Số lượng"), 2), {
    kind: "field",
    field: "staffIds",
    message: "Lịch này cần đúng 2 nhân viên.",
  });
  assert.deepEqual(classifyRescheduleError(http(409, "NO_CAPACITY", "Hết"), 1), {
    kind: "alert",
    message: "Hết chỗ trong thời gian này, vui lòng chọn ngày khác.",
  });
  assert.deepEqual(classifyRescheduleError(http(409, "CAGE_CONFLICT", "Trùng chuồng"), 1), {
    kind: "alert",
    message: "Chuồng đã được gán trong thời gian này.",
  });

  const staleError = http(409, "INVALID_TRANSITION", "Trạng thái đổi");
  assert.deepEqual(classifyRescheduleError(staleError, 1), {
    kind: "stale",
    error: staleError,
  });

  const notFoundError = http(404, "NOT_FOUND", "Không thấy");
  assert.deepEqual(classifyRescheduleError(notFoundError, 1), {
    kind: "stale",
    error: notFoundError,
  });

  const validationError = http(400, "VALIDATION_ERROR", "Lỗi dữ liệu");
  assert.deepEqual(classifyRescheduleError(validationError, 1), {
    kind: "error",
    error: validationError,
  });

  assert.equal(isStaleAppointmentError(staleError), true);
  assert.equal(isStaleAppointmentError(notFoundError), true);
  assert.equal(isStaleAppointmentError(validationError), false);
});
