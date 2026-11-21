import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppointmentTicketView } from "../features/spa-appointments/components/appointment-ticket.tsx";
import {
  buildSpaListParams,
  canOpenExecution,
  groupSpaAppointments,
} from "../features/spa-appointments/list.ts";

const TODAY = "2026-11-22";

function makeAppointment(overrides = {}) {
  return {
    appointmentId: "a0000000-0000-4000-8000-000000000001",
    type: "Spa",
    customerId: "c1",
    petId: "p1",
    petName: "Bông",
    status: "Confirmed",
    sizeGroup: "Small",
    slotStart: "2026-11-22T02:00:00Z",
    slotEnd: "2026-11-22T03:00:00Z",
    createdAt: "2026-11-20T00:00:00Z",
    updatedAt: "2026-11-20T00:00:00Z",
    ...overrides,
  };
}

const PET = {
  petId: "p1",
  customerId: "c1",
  name: "Bông",
  species: "Dog",
  breed: "Poodle",
  temperament: "Normal",
  weightKg: 4.5,
  heightCm: 25,
  coatNote: null,
  notes: "Dị ứng sữa tắm có mùi",
  sizeGroup: "Small",
  isActive: true,
};

test("1. buildSpaListParams: trả đúng params cho status", () => {
  assert.deepEqual(buildSpaListParams("Received"), {
    type: "Spa",
    status: "Received",
    page: 1,
    pageSize: 100,
  });
});

test("2. groupSpaAppointments: lịch hôm nay, sắp tới và hôm qua phân nhóm đúng", () => {
  const todayAppt = makeAppointment({ appointmentId: "a-today", slotStart: "2026-11-22T02:00:00Z" });
  const upcomingAppt = makeAppointment({ appointmentId: "a-upcoming", slotStart: "2026-11-23T02:00:00Z" });
  const pastAppt = makeAppointment({ appointmentId: "a-past", slotStart: "2026-11-21T02:00:00Z" });

  const groups = groupSpaAppointments([[todayAppt, upcomingAppt, pastAppt]], TODAY);
  assert.equal(groups.today.length, 1);
  assert.equal(groups.today[0].appointmentId, "a-today");
  assert.equal(groups.upcoming.length, 1);
  assert.equal(groups.upcoming[0].appointmentId, "a-upcoming");
});

test("3. groupSpaAppointments: mốc nửa đêm tính theo giờ cửa hàng (+07:00)", () => {
  // 17:30 UTC ngày 22/11 = 00:30 ngày 23/11 giờ VN -> upcoming
  const appt1 = makeAppointment({ appointmentId: "a-midnight-next", slotStart: "2026-11-22T17:30:00Z" });
  // 16:30 UTC ngày 22/11 = 23:30 ngày 22/11 giờ VN -> today
  const appt2 = makeAppointment({ appointmentId: "a-night-today", slotStart: "2026-11-22T16:30:00Z" });

  const groups = groupSpaAppointments([[appt1, appt2]], TODAY);
  assert.deepEqual(groups.today.map((a) => a.appointmentId), ["a-night-today"]);
  assert.deepEqual(groups.upcoming.map((a) => a.appointmentId), ["a-midnight-next"]);
});

test("4. groupSpaAppointments: sắp xếp theo giờ tăng dần trong từng nhóm", () => {
  const apptLate = makeAppointment({ appointmentId: "a-late", slotStart: "2026-11-22T07:00:00Z" });
  const apptEarly = makeAppointment({ appointmentId: "a-early", slotStart: "2026-11-22T02:00:00Z" });

  const groups = groupSpaAppointments([[apptLate, apptEarly]], TODAY);
  assert.deepEqual(groups.today.map((a) => a.appointmentId), ["a-early", "a-late"]);
});

test("5. groupSpaAppointments: lọc đúng trạng thái hôm nay và ngày sau", () => {
  const confirmed = makeAppointment({ appointmentId: "a1", status: "Confirmed", slotStart: "2026-11-22T02:00:00Z" });
  const received = makeAppointment({ appointmentId: "a2", status: "Received", slotStart: "2026-11-22T03:00:00Z" });
  const inProgress = makeAppointment({ appointmentId: "a3", status: "InProgress", slotStart: "2026-11-22T04:00:00Z" });
  const completed = makeAppointment({ appointmentId: "a4", status: "Completed", slotStart: "2026-11-22T05:00:00Z" });
  const cancelled = makeAppointment({ appointmentId: "a5", status: "Cancelled", slotStart: "2026-11-22T06:00:00Z" });
  const pending = makeAppointment({ appointmentId: "a6", status: "Pending", slotStart: "2026-11-22T07:00:00Z" });

  const tomorrowReceived = makeAppointment({ appointmentId: "a7", status: "Received", slotStart: "2026-11-23T02:00:00Z" });
  const tomorrowConfirmed = makeAppointment({ appointmentId: "a8", status: "Confirmed", slotStart: "2026-11-23T03:00:00Z" });

  const groups = groupSpaAppointments(
    [[confirmed, received, inProgress, completed, cancelled, pending, tomorrowReceived, tomorrowConfirmed]],
    TODAY,
  );
  assert.deepEqual(groups.today.map((a) => a.appointmentId), ["a1", "a2", "a3"]);
  assert.deepEqual(groups.upcoming.map((a) => a.appointmentId), ["a8"]);
});

test("6. groupSpaAppointments: loại lịch type Hotel và lịch thiếu slotStart", () => {
  const hotel = makeAppointment({ appointmentId: "h1", type: "Hotel", slotStart: "2026-11-22T02:00:00Z" });
  const noSlot = makeAppointment({ appointmentId: "n1", slotStart: null });
  const valid = makeAppointment({ appointmentId: "v1", slotStart: "2026-11-22T02:00:00Z" });

  const groups = groupSpaAppointments([[hotel, noSlot, valid]], TODAY);
  assert.deepEqual(groups.today.map((a) => a.appointmentId), ["v1"]);
});

test("7. groupSpaAppointments: trùng mã giữa hai danh sách thì giữ bản đứng sau", () => {
  const list1 = [makeAppointment({ appointmentId: "dup-1", status: "Confirmed", slotStart: "2026-11-22T02:00:00Z" })];
  const list2 = [makeAppointment({ appointmentId: "dup-1", status: "Received", slotStart: "2026-11-22T02:00:00Z" })];

  const groups = groupSpaAppointments([list1, list2], TODAY);
  assert.equal(groups.today.length, 1);
  assert.equal(groups.today[0].status, "Received");
});

test("8. groupSpaAppointments: giới hạn UPCOMING_LIMIT = 20, hiddenUpcoming chính xác", () => {
  const upcomingList = Array.from({ length: 25 }, (_, i) => {
    const hour = String(i % 12).padStart(2, "0");
    const day = String(23 + Math.floor(i / 12)).padStart(2, "0");
    return makeAppointment({
      appointmentId: `up-${String(i).padStart(2, "0")}`,
      status: "Confirmed",
      slotStart: `2026-11-${day}T${hour}:00:00Z`,
    });
  });

  const groups = groupSpaAppointments([upcomingList], TODAY);
  assert.equal(groups.upcoming.length, 20);
  assert.equal(groups.hiddenUpcoming, 5);
  assert.equal(groups.upcoming[0].appointmentId, "up-00");
  assert.equal(groups.upcoming[19].appointmentId, "up-19");
});

test("9. canOpenExecution: đúng với Received, InProgress; sai với các trạng thái khác", () => {
  assert.equal(canOpenExecution("Received"), true);
  assert.equal(canOpenExecution("InProgress"), true);
  assert.equal(canOpenExecution("Confirmed"), false);
  assert.equal(canOpenExecution("Completed"), false);
  assert.equal(canOpenExecution("Cancelled"), false);
  assert.equal(canOpenExecution("Pending"), false);
  assert.equal(canOpenExecution("InStay"), false);
});

test("10. AppointmentTicketView: today + Received đầy đủ thông tin", () => {
  const appt = makeAppointment({
    appointmentId: "a-full",
    status: "Received",
    slotStart: "2026-11-22T02:00:00Z",
    slotEnd: "2026-11-22T04:00:00Z",
  });
  const detail = {
    ...appt,
    services: [
      { serviceId: "s1", name: "Tắm & sấy lông", isDone: false },
      { serviceId: "s2", name: "Cắt tỉa lông", isDone: false },
    ],
  };

  const html = renderToStaticMarkup(
    React.createElement(AppointmentTicketView, {
      appointment: appt,
      variant: "today",
      pet: PET,
      detail,
      detailState: "ready",
    }),
  );

  assert.ok(html.includes("09:00"));
  assert.ok(html.includes("đến 11:00"));
  assert.ok(html.includes("Chó Poodle, hồ sơ nhóm Nhỏ"));
  assert.ok(html.includes("Tắm &amp; sấy lông, Cắt tỉa lông"));
  assert.ok(html.includes("Dị ứng sữa tắm có mùi"));
  assert.ok(html.includes("Đã tiếp nhận"));
  assert.ok(html.includes('href="/lich-hen/a-full/thuc-hien"'));
  assert.ok(html.includes("Mở"));
  assert.ok(!html.includes("Chờ lễ tân tiếp nhận"));
  assert.ok(!html.includes("Chờ khách xác nhận chi phí mới"));
});

test("11. AppointmentTicketView: today + Confirmed có Xem và Chờ lễ tân tiếp nhận, không có Mở", () => {
  const appt = makeAppointment({ appointmentId: "a-conf", status: "Confirmed" });
  const html = renderToStaticMarkup(
    React.createElement(AppointmentTicketView, {
      appointment: appt,
      variant: "today",
      pet: PET,
      detail: appt,
      detailState: "ready",
    }),
  );

  assert.ok(html.includes("Chờ lễ tân tiếp nhận"));
  assert.ok(html.includes('href="/lich-hen/a-conf"'));
  assert.ok(html.includes("Xem"));
  assert.ok(!html.includes(">Mở<"));
});

test("12. AppointmentTicketView: today với pendingCostConfirmation", () => {
  const appt = makeAppointment({ status: "Received" });
  const detailPending = {
    ...appt,
    pendingCostConfirmation: {
      actualWeightKg: 11.2,
      newSizeGroup: "Medium",
      oldAmount: 1,
      newAmount: 2,
      status: "Pending",
      expiresAt: "2026-11-22T10:00:00Z",
    },
  };

  const htmlPending = renderToStaticMarkup(
    React.createElement(AppointmentTicketView, {
      appointment: appt,
      variant: "today",
      pet: PET,
      detail: detailPending,
      detailState: "ready",
    }),
  );
  assert.ok(htmlPending.includes("Chờ khách xác nhận chi phí mới"));

  const detailAccepted = {
    ...appt,
    pendingCostConfirmation: {
      ...detailPending.pendingCostConfirmation,
      status: "Accepted",
    },
  };
  const htmlAccepted = renderToStaticMarkup(
    React.createElement(AppointmentTicketView, {
      appointment: appt,
      variant: "today",
      pet: PET,
      detail: detailAccepted,
      detailState: "ready",
    }),
  );
  assert.ok(!htmlAccepted.includes("Chờ khách xác nhận chi phí mới"));

  const htmlNoPending = renderToStaticMarkup(
    React.createElement(AppointmentTicketView, {
      appointment: appt,
      variant: "today",
      pet: PET,
      detail: appt,
      detailState: "ready",
    }),
  );
  assert.ok(!htmlNoPending.includes("Chờ khách xác nhận chi phí mới"));
});

test("13. AppointmentTicketView: upcoming hiển thị nhãn ngày, không có Mở, Xem, hàng nhãn", () => {
  const appt = makeAppointment({
    appointmentId: "a-up",
    status: "Confirmed",
    slotStart: "2026-11-23T02:00:00Z",
  });
  const html = renderToStaticMarkup(
    React.createElement(AppointmentTicketView, {
      appointment: appt,
      variant: "upcoming",
      pet: PET,
      detail: appt,
      detailState: "ready",
    }),
  );

  assert.ok(html.includes("09:00"));
  assert.ok(html.includes("T2 23/11"));
  assert.ok(html.includes("nhóm Nhỏ"));
  assert.ok(!html.includes("hồ sơ nhóm Nhỏ"));
  assert.ok(!html.includes(">Mở<"));
  assert.ok(!html.includes(">Xem<"));
  assert.ok(!html.includes("Chờ lễ tân tiếp nhận"));
});

test("14. AppointmentTicketView: loading và error state", () => {
  const appt = makeAppointment({ petName: undefined });
  const htmlLoading = renderToStaticMarkup(
    React.createElement(AppointmentTicketView, {
      appointment: appt,
      variant: "today",
      pet: undefined,
      detail: undefined,
      detailState: "loading",
    }),
  );
  assert.ok(htmlLoading.includes("animate-pulse"));
  assert.ok(htmlLoading.includes("Thú cưng"));

  const apptWithName = makeAppointment({ petName: "Miu" });
  const htmlError = renderToStaticMarkup(
    React.createElement(AppointmentTicketView, {
      appointment: apptWithName,
      variant: "today",
      pet: undefined,
      detail: undefined,
      detailState: "error",
    }),
  );
  assert.ok(htmlError.includes("Chưa tải được chi tiết lịch."));
  assert.ok(htmlError.includes("Miu"));
});
