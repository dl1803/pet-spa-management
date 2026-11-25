import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BUFFER_MINUTES, buildLiveSnapshot, keepStoreDay, needsDetail } from "../features/dashboard/live-snapshot.ts";
import { MOCK_DASHBOARD } from "../features/dashboard/mock-data.ts";
import { DashboardScreen } from "../features/dashboard/screens/dashboard-screen.tsx";
import { ApiError } from "../lib/api/errors.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";
import { STAFF_PAGE_SIZE, staffKeys } from "../lib/queries/staff.ts";

const DAY_KEY = "2026-11-27";
const UPDATED_AT = Date.parse("2026-11-27T10:15:00+07:00");

const STAFF_HANH = {
  staffId: "staff-hanh",
  userName: "0901000001",
  fullName: "Nguyễn Thị Hạnh",
  staffRole: "SpaStaff",
  isActive: true,
};
const STAFF_QUYEN = {
  staffId: "staff-quyen",
  userName: "0901000002",
  fullName: "Trần Thị Quyên",
  staffRole: "SpaStaff",
  isActive: true,
};
const STAFF_AN = {
  staffId: "staff-an",
  userName: "0901000003",
  fullName: "Lê Minh An",
  staffRole: "Receptionist",
  isActive: true,
};

const makeSpa = (id, status, slotStart, slotEnd, petName) => ({
  appointmentId: id,
  type: "Spa",
  customerId: "cust-01",
  petId: `pet-${id}`,
  petName,
  status,
  sizeGroup: "Small",
  slotStart,
  slotEnd,
  createdAt: "2026-11-25T08:00:00+07:00",
  updatedAt: "2026-11-25T08:00:00+07:00",
});

const A1 = makeSpa("5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01", "Confirmed", "2026-11-27T09:00:00+07:00", "2026-11-27T10:00:00+07:00", "Bông");
const A2 = makeSpa("5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e02", "InProgress", "2026-11-27T10:00:00+07:00", "2026-11-27T11:30:00+07:00", "Mít");
const A3 = makeSpa("5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03", "Pending", "2026-11-27T14:00:00+07:00", "2026-11-27T15:00:00+07:00", "Mochi");
const A4 = makeSpa("5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e04", "Completed", "2026-11-27T08:00:00+07:00", "2026-11-27T08:50:00+07:00", "Gạo");
const A5 = makeSpa("5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e05", "Confirmed", "2026-11-28T09:00:00+07:00", "2026-11-28T10:00:00+07:00", "Nâu");

const http = (status, code, detail) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });

function renderScreen(configure) {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  if (configure) configure(client);
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client }, React.createElement(DashboardScreen)),
  );
}

test("keepStoreDay: lọc đúng theo ngày múi giờ cửa hàng và loại lịch không có slotStart", () => {
  const earlyStore = makeSpa("early-utc", "Confirmed", "2026-11-26T18:00:00Z", "2026-11-26T19:00:00Z", "Sớm");
  const nextStore = makeSpa("next-utc", "Confirmed", "2026-11-27T17:30:00Z", "2026-11-27T18:30:00Z", "Khuya");
  const noSlot = makeSpa("no-slot", "Confirmed", null, null, "Thiếu giờ");

  const kept = keepStoreDay([A1, A5, noSlot, earlyStore, nextStore], DAY_KEY);
  assert.deepEqual(
    kept.map((item) => item.appointmentId),
    [A1.appointmentId, earlyStore.appointmentId],
  );
});

test("needsDetail: chỉ lấy chi tiết cho Confirmed, Received, InProgress", () => {
  assert.equal(needsDetail(A1), true);
  assert.equal(needsDetail({ ...A1, status: "Received" }), true);
  assert.equal(needsDetail(A2), true);
  assert.equal(needsDetail(A3), false);
  assert.equal(needsDetail(A4), false);
  assert.equal(needsDetail({ ...A1, status: "Cancelled" }), false);
});

test("buildLiveSnapshot: ghép chi tiết nhân viên, shifts rỗng, giữ khối chưa nối API từ MOCK_DASHBOARD", () => {
  const detailA1 = {
    ...A1,
    staff: [{ staffId: STAFF_HANH.staffId, fullName: STAFF_HANH.fullName, isHolding: true }],
  };
  const snapshot = buildLiveSnapshot({
    now: "2026-11-27T10:15:00+07:00",
    staff: [STAFF_HANH, STAFF_QUYEN, STAFF_AN],
    pendingCounts: { spa: 2, hotel: 1 },
    spaItems: [A1, A3],
    details: [detailA1],
  });

  assert.equal(snapshot.bufferMinutes, BUFFER_MINUTES);
  assert.deepEqual(snapshot.shifts, []);
  assert.equal(snapshot.spaToday[0], detailA1);
  assert.equal(snapshot.spaToday[1], A3);
  assert.equal(snapshot.hotelAppointments, MOCK_DASHBOARD.hotelAppointments);
  assert.equal(snapshot.cages, MOCK_DASHBOARD.cages);
  assert.equal(snapshot.unpaidPayments, MOCK_DASHBOARD.unpaidPayments);
});

test("DashboardScreen chưa có dữ liệu: hiển thị tiêu đề và trạng thái đang tải", () => {
  const html = renderScreen();
  assert.ok(html.includes("<h1>Tổng quan hôm nay</h1>"));
  assert.match(html, /role="status"/);
  assert.ok(html.includes("Đang tải tổng quan…"));
});

test("DashboardScreen lỗi: 500 hiện role alert và Thử lại; 403 hiện không có quyền", () => {
  const html500 = renderScreen((client) => {
    const query = client.getQueryCache().build(client, { queryKey: appointmentKeys.dashboardSpaToday });
    query.setState({
      ...query.state,
      status: "error",
      fetchStatus: "idle",
      error: http(500, "INTERNAL_ERROR", "Lỗi máy chủ."),
      errorUpdatedAt: Date.now(),
    });
  });
  assert.match(html500, /role="alert"/);
  assert.ok(html500.includes("Thử lại"));

  const html403 = renderScreen((client) => {
    const query = client.getQueryCache().build(client, { queryKey: appointmentKeys.dashboardSpaToday });
    query.setState({
      ...query.state,
      status: "error",
      fetchStatus: "idle",
      error: http(403, "FORBIDDEN", "Không có quyền."),
      errorUpdatedAt: Date.now(),
    });
  });
  assert.ok(html403.includes("Bạn không có quyền xem trang này"));
});

test("DashboardScreen thành công: vẽ tiến độ spa, số liệu và giữ khối mô phỏng", () => {
  const detailA1 = {
    ...A1,
    staff: [{ staffId: STAFF_HANH.staffId, fullName: STAFF_HANH.fullName, isHolding: true }],
  };
  const detailA2 = {
    ...A2,
    staff: [{ staffId: STAFF_QUYEN.staffId, fullName: STAFF_QUYEN.fullName, isHolding: true }],
  };

  const html = renderScreen((client) => {
    client.setQueryData(
      appointmentKeys.dashboardSpaToday,
      { dateKey: DAY_KEY, items: [A1, A2, A3, A4] },
      { updatedAt: UPDATED_AT },
    );
    client.setQueryData(
      appointmentKeys.dashboardPendingCount("Spa"),
      { page: 1, pageSize: 1, total: 2, items: [] },
      { updatedAt: UPDATED_AT },
    );
    client.setQueryData(
      appointmentKeys.dashboardPendingCount("Hotel"),
      { page: 1, pageSize: 1, total: 1, items: [] },
      { updatedAt: UPDATED_AT },
    );
    client.setQueryData(
      staffKeys.list({ page: 1, pageSize: STAFF_PAGE_SIZE }),
      { page: 1, pageSize: STAFF_PAGE_SIZE, total: 3, items: [STAFF_HANH, STAFF_QUYEN, STAFF_AN] },
      { updatedAt: UPDATED_AT },
    );
    client.setQueryData(appointmentKeys.detail(A1.appointmentId), detailA1, { updatedAt: UPDATED_AT });
    client.setQueryData(appointmentKeys.detail(A2.appointmentId), detailA2, { updatedAt: UPDATED_AT });
  });

  assert.ok(html.includes("27/11/2026. Cập nhật lúc 10:15."));
  assert.equal((html.match(/data-status=/g) ?? []).length, 3);
  assert.ok(html.includes("Chưa phân công"));
  assert.ok(html.includes("Spa 2, lưu trú 1. Cần bạn xử lý"));
  assert.ok(html.includes("1 đang làm, 0 đã tiếp nhận, 1 chờ đến"));
  assert.ok(!html.includes("data-shift"));
  assert.ok(html.includes("Chuồng đang chứa"));
});
