import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { LiveAppointmentHeader } from "../features/appointments/components/live-appointment-header.tsx";
import { RescheduleHotelDialog } from "../features/appointments/components/reschedule-hotel-dialog.tsx";
import { RescheduleSpaDialog } from "../features/appointments/components/reschedule-spa-dialog.tsx";
import { petKeys } from "../lib/queries/pets.ts";
import { staffKeys } from "../lib/queries/staff.ts";

const SPA_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01";
const HOTEL_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e02";

const mockStaffPage = {
  page: 1,
  pageSize: 100,
  total: 3,
  items: [
    { staffId: "st1", fullName: "Lê Minh Tâm", staffRole: "SpaStaff", isActive: true, userName: "0900000001" },
    { staffId: "st2", fullName: "Nguyễn Văn Lễ Tân", staffRole: "Receptionist", isActive: true, userName: "0900000002" },
    { staffId: "st3", fullName: "Trần Thị Cũ", staffRole: "SpaStaff", isActive: false, userName: "0900000003" },
  ],
};

function renderWithClient(element, { staffData } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  if (staffData !== undefined) {
    client.setQueryData(staffKeys.list({ page: 1, pageSize: 100 }), staffData);
  }
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(ToastProvider, null, element),
    ),
  );
}

test("RescheduleSpaDialog: lịch Pending không có nhóm nhân viên", () => {
  const appointment = {
    appointmentId: SPA_ID,
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

  const html = renderWithClient(
    React.createElement(RescheduleSpaDialog, {
      appointment,
      onClose() {},
      fallbackFocusRef: { current: null },
    }),
    { staffData: mockStaffPage },
  );

  assert.ok(html.includes("Đổi lịch spa LH-5F1C2A9B"));
  assert.ok(html.includes("Ngày") && html.includes("Mốc giờ"));
  assert.ok(!html.includes("Nhân viên spa phụ trách"));
  assert.ok(!html.includes("Lê Minh Tâm"));
});

test("RescheduleSpaDialog: lịch Confirmed có nhóm nhân viên, loại bỏ Lễ tân và người không active", () => {
  const appointment = {
    appointmentId: SPA_ID,
    type: "Spa",
    customerId: "c1",
    petId: "p1",
    status: "Confirmed",
    sizeGroup: "Small",
    staffRequired: 1,
    slotStart: "2026-11-25T09:00:00+07:00",
    services: [{ serviceId: "s1", isDone: false }],
    staff: [{ staffId: "st1", fullName: "Lê Minh Tâm", isHolding: true }],
    createdAt: "",
    updatedAt: "",
  };

  const html = renderWithClient(
    React.createElement(RescheduleSpaDialog, {
      appointment,
      onClose() {},
      fallbackFocusRef: { current: null },
    }),
    { staffData: mockStaffPage },
  );

  assert.ok(html.includes("Nhân viên spa phụ trách, cần 1 người"));
  assert.ok(html.includes("Lê Minh Tâm"));
  // Lễ tân và nhân viên không active bị loại
  assert.ok(!html.includes("Nguyễn Văn Lễ Tân"));
  assert.ok(!html.includes("Trần Thị Cũ"));
});

test("RescheduleHotelDialog: có 4 ô, không có nhóm nhân viên hoặc chuồng", () => {
  const appointment = {
    appointmentId: HOTEL_ID,
    type: "Hotel",
    customerId: "c1",
    petId: "p1",
    status: "Confirmed",
    sizeGroup: "Small",
    plannedCheckIn: "2026-11-25T09:00:00+07:00",
    plannedCheckOut: "2026-11-27T12:00:00+07:00",
    cageId: "cage-01",
    createdAt: "",
    updatedAt: "",
  };

  const html = renderWithClient(
    React.createElement(RescheduleHotelDialog, {
      appointment,
      onClose() {},
      fallbackFocusRef: { current: null },
    }),
  );

  assert.ok(html.includes("Đổi lịch lưu trú LH-5F1C2A9B"));
  assert.ok(html.includes("Ngày nhận"));
  assert.ok(html.includes("Giờ nhận"));
  assert.ok(html.includes("Ngày trả"));
  assert.ok(html.includes("Giờ trả"));
  assert.ok(!html.includes("Nhân viên"));
  assert.ok(!html.includes("cage-01"));
  assert.ok(!html.includes("Chọn chuồng"));
});

test("LiveAppointmentHeader: có nút Đổi lịch với Pending/Confirmed, không có với Completed", () => {
  const baseSpa = {
    appointmentId: SPA_ID,
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

  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  client.setQueryData(petKeys.detail("p1"), { petId: "p1", name: "Cún", species: "Dog" });

  const renderHeader = (appt) =>
    renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(ToastProvider, null, React.createElement(LiveAppointmentHeader, { appointment: appt })),
      ),
    );

  const pendingHtml = renderHeader(baseSpa);
  assert.ok(pendingHtml.includes("Đổi lịch"));

  const confirmedHtml = renderHeader({ ...baseSpa, status: "Confirmed" });
  assert.ok(confirmedHtml.includes("Đổi lịch"));

  const completedHtml = renderHeader({ ...baseSpa, status: "Completed" });
  assert.ok(!completedHtml.includes("Đổi lịch"));
});
