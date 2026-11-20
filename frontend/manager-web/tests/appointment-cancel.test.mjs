import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { CANCEL_REASON_OPTIONS, canCancelAppointment } from "../features/appointments/cancel.ts";
import { CancelAppointmentDialog } from "../features/appointments/components/cancel-appointment-dialog.tsx";
import { LiveAppointmentHeader } from "../features/appointments/components/live-appointment-header.tsx";
import { petKeys } from "../lib/queries/pets.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01";

test("canCancelAppointment: spa hủy được đến InProgress; hotel hủy được đến InStay; Completed/Cancelled không hủy được", () => {
  // Spa
  assert.equal(canCancelAppointment({ type: "Spa", status: "Pending" }), true);
  assert.equal(canCancelAppointment({ type: "Spa", status: "Confirmed" }), true);
  assert.equal(canCancelAppointment({ type: "Spa", status: "Received" }), true);
  assert.equal(canCancelAppointment({ type: "Spa", status: "InProgress" }), true);
  assert.equal(canCancelAppointment({ type: "Spa", status: "InStay" }), false);
  assert.equal(canCancelAppointment({ type: "Spa", status: "Completed" }), false);
  assert.equal(canCancelAppointment({ type: "Spa", status: "Cancelled" }), false);

  // Hotel
  assert.equal(canCancelAppointment({ type: "Hotel", status: "Pending" }), true);
  assert.equal(canCancelAppointment({ type: "Hotel", status: "Confirmed" }), true);
  assert.equal(canCancelAppointment({ type: "Hotel", status: "InStay" }), true);
  assert.equal(canCancelAppointment({ type: "Hotel", status: "Received" }), false);
  assert.equal(canCancelAppointment({ type: "Hotel", status: "InProgress" }), false);
  assert.equal(canCancelAppointment({ type: "Hotel", status: "Completed" }), false);
  assert.equal(canCancelAppointment({ type: "Hotel", status: "Cancelled" }), false);
});

test("CancelAppointmentDialog: có đúng 2 lựa chọn với nhãn/hint nguyên văn, không chọn sẵn, có đủ 2 nút", () => {
  const appointment = {
    appointmentId: ID,
    type: "Spa",
    customerId: "c1",
    petId: "p1",
    status: "Confirmed",
    sizeGroup: "Small",
    createdAt: "",
    updatedAt: "",
  };

  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  const html = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(CancelAppointmentDialog, {
          appointment,
          onClose() {},
          fallbackFocusRef: { current: null },
        }),
      ),
    ),
  );

  assert.ok(html.includes("Hủy lịch hẹn LH-5F1C2A9B"));
  assert.ok(html.includes("Chọn lý do. Khách và nhân viên phụ trách nhận thông báo kèm lý do."));

  // 2 lựa chọn nguyên văn
  for (const option of CANCEL_REASON_OPTIONS) {
    assert.ok(html.includes(option.label));
    assert.ok(html.includes(option.hint));
  }

  // Không có radio nào checked
  assert.equal(html.includes('checked=""'), false);

  // Nút
  assert.ok(html.includes("Quay lại"));
  assert.ok(html.includes("Hủy lịch hẹn"));
});

test("LiveAppointmentHeader: Confirmed có cả Đổi lịch và Hủy lịch; Received chỉ có Hủy lịch; Completed/Cancelled không có nút", () => {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  client.setQueryData(petKeys.detail("p1"), { petId: "p1", name: "Cún", species: "Dog" });

  const renderHeader = (status) =>
    renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(
          ToastProvider,
          null,
          React.createElement(LiveAppointmentHeader, {
            appointment: {
              appointmentId: ID,
              type: "Spa",
              customerId: "c1",
              petId: "p1",
              status,
              sizeGroup: "Small",
              slotStart: "2026-11-25T09:00:00+07:00",
              services: [{ serviceId: "s1", isDone: false }],
              createdAt: "",
              updatedAt: "",
            },
          }),
        ),
      ),
    );

  const confirmedHtml = renderHeader("Confirmed");
  assert.ok(confirmedHtml.includes("Đổi lịch"));
  assert.ok(confirmedHtml.includes("Hủy lịch"));

  const receivedHtml = renderHeader("Received");
  assert.ok(!receivedHtml.includes("Đổi lịch"));
  assert.ok(receivedHtml.includes("Hủy lịch"));

  const completedHtml = renderHeader("Completed");
  assert.ok(!completedHtml.includes("Đổi lịch"));
  assert.ok(!completedHtml.includes("Hủy lịch"));

  const cancelledHtml = renderHeader("Cancelled");
  assert.ok(!cancelledHtml.includes("Đổi lịch"));
  assert.ok(!cancelledHtml.includes("Hủy lịch"));
});
