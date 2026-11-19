import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { LiveAppointmentDetail } from "../features/appointments/components/live-appointment-detail.tsx";
import { AppointmentDetailScreen } from "../features/appointments/screens/appointment-detail-screen.tsx";
import { ApiError } from "../lib/api/errors.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";
import { petKeys } from "../lib/queries/pets.ts";

const NAU = "5f1c0407-7e44-4c0a-9d21-0a1b2c3d4e00";
const SPA_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e99";
const HOTEL_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e88";

const http = (status, code, detail) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });

function renderDetail(appointmentId, { appointment, pet, error } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  if (appointment !== undefined) {
    client.setQueryData(appointmentKeys.detail(appointmentId), appointment);
  }
  if (pet !== undefined && appointment?.petId) {
    client.setQueryData(petKeys.detail(appointment.petId), pet);
  }
  if (error !== undefined) {
    const query = client.getQueryCache().build(client, { queryKey: appointmentKeys.detail(appointmentId) });
    query.setState({ ...query.state, status: "error", fetchStatus: "idle", error, errorUpdatedAt: Date.now() });
  }
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(ToastProvider, null, React.createElement(LiveAppointmentDetail, { appointmentId })),
    ),
  );
}

test("lịch spa thật có tiêu đề, badge trạng thái, dòng mô tả; không có nút Đổi lịch/Hủy lịch", () => {
  const appointment = {
    appointmentId: SPA_ID,
    type: "Spa",
    customerId: "cust-01",
    customerName: "Nguyễn Văn A",
    petId: "pet-01",
    petName: "Miu Miu",
    status: "Pending",
    sizeGroup: "Small",
    slotStart: "2026-11-25T09:00:00+07:00",
    slotEnd: "2026-11-25T10:00:00+07:00",
    createdAt: "2026-11-20T10:00:00+07:00",
    updatedAt: "2026-11-20T10:00:00+07:00",
  };
  const pet = {
    petId: "pet-01",
    customerId: "cust-01",
    name: "Miu Miu",
    species: "Cat",
    breed: "Anh lông ngắn",
    temperament: "Calm",
    weightKg: 4,
    sizeGroup: "Small",
    isActive: true,
  };

  const html = renderDetail(SPA_ID, { appointment, pet });
  assert.ok(html.includes("Lịch spa của Miu Miu"));
  assert.ok(html.includes("Chờ xác nhận"));
  assert.ok(html.includes("LH-5F1C2A9B. Nguyễn Văn A."));
  assert.ok(!html.includes("Đổi lịch") && !html.includes("Hủy lịch"));
  assert.equal((html.match(/<button/g) ?? []).length, 0);
});

test("lịch lưu trú thật có tiêu đề, mô tả có Nhận và Trả", () => {
  const appointment = {
    appointmentId: HOTEL_ID,
    type: "Hotel",
    customerId: "cust-02",
    customerName: "Trần Thị B",
    petId: "pet-02",
    petName: "Lu Lu",
    status: "Confirmed",
    sizeGroup: "Medium",
    plannedCheckIn: "2026-11-26T09:00:00+07:00",
    plannedCheckOut: "2026-11-28T12:00:00+07:00",
    createdAt: "2026-11-20T10:00:00+07:00",
    updatedAt: "2026-11-20T10:00:00+07:00",
  };
  const pet = {
    petId: "pet-02",
    customerId: "cust-02",
    name: "Lu Lu",
    species: "Dog",
    breed: "Poodle",
    temperament: "Normal",
    weightKg: 8,
    sizeGroup: "Medium",
    isActive: true,
  };

  const html = renderDetail(HOTEL_ID, { appointment, pet });
  assert.ok(html.includes("Lịch lưu trú của Lu Lu"));
  assert.ok(html.includes("Đã xác nhận"));
  assert.ok(html.includes("Nhận 26/11/2026 09:00") && html.includes("Trả 28/11/2026 12:00"));
});

test("chưa có dữ liệu: báo đang tải lịch hẹn với role status và aria-busy", () => {
  const html = renderDetail("unknown-loading-id");
  assert.match(html, /role="status"[^>]*aria-busy="true"/);
  assert.ok(html.includes("Đang tải lịch hẹn…"));
});

test("lỗi 403 FORBIDDEN: hiển thị thông báo không có quyền", () => {
  const html = renderDetail("forbidden-id", { error: http(403, "FORBIDDEN", "Không có quyền.") });
  assert.ok(html.includes("Bạn không có quyền xem trang này"));
});

test("lỗi 404: hiển thị không tìm thấy lịch hẹn kèm liên kết về tổng quan", () => {
  const html = renderDetail("notfound-id", { error: http(404, "NOT_FOUND", "Không tìm thấy.") });
  assert.ok(html.includes("Không tìm thấy lịch hẹn"));
  assert.match(html, /<a [^>]*href="\/"[^>]*>Về trang tổng quan<\/a>/);
});

test("lỗi 500: hiển thị thông báo lỗi role alert và nút Thử lại", () => {
  const html = renderDetail("error-id", { error: http(500, "INTERNAL_ERROR", "Lỗi máy chủ.") });
  assert.match(html, /role="alert"/);
  assert.ok(html.includes("Thử lại"));
});

test("AppointmentDetailScreen: ID mô phỏng giữ nguyên nhánh mô phỏng có ảnh minh chứng", () => {
  const html = renderToStaticMarkup(React.createElement(AppointmentDetailScreen, { appointmentId: NAU }));
  assert.ok(html.includes("Ảnh minh chứng"));
  assert.ok(html.includes("Lịch spa của Nâu"));
});
