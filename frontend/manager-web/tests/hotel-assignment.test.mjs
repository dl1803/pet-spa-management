import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { HotelAssignment } from "../features/pending/components/hotel-assignment.tsx";
import { ApiError } from "../lib/api/errors.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";
import { cageKeys } from "../lib/queries/cages.ts";
import { petKeys } from "../lib/queries/pets.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03";
const b3 = { cageId: "c3", code: "B3", species: "Cat", sizeGroup: "Medium", isActive: true };
const appointment = {
  appointmentId: ID, type: "Hotel", customerId: "c2", petId: "p-may", status: "Pending", sizeGroup: "Medium",
  plannedCheckIn: "2026-10-08T09:00:00+07:00", plannedCheckOut: "2026-10-10T17:00:00+07:00",
  createdAt: "2026-10-05T09:00:00+07:00", updatedAt: "2026-10-05T09:00:00+07:00",
};
const http = (status, code, detail) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });

function render({ suggestions, error, cages, pet } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  if (suggestions !== undefined) client.setQueryData(appointmentKeys.suggestions(ID), suggestions);
  if (cages !== undefined) {
    client.setQueryData(cageKeys.list(), { items: cages, page: 1, pageSize: 100, total: cages.length });
  }
  if (pet !== undefined) {
    client.setQueryData(petKeys.detail(appointment.petId), pet);
  }
  if (error !== undefined) {
    const query = client.getQueryCache().build(client, { queryKey: appointmentKeys.suggestions(ID) });
    query.setState({ ...query.state, status: "error", fetchStatus: "idle", error, errorUpdatedAt: Date.now() });
  }
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(ToastProvider, null, React.createElement(HotelAssignment, { appointment, onProcessed() {} })),
    ),
  );
}

const confirmButton = (html) => html.match(/<button[^>]*>Xác nhận lịch lưu trú<\/button>/)?.[0] ?? "";
const rejectButton = (html) => html.match(/<button[^>]*>(?:(?!<\/button>).)*Từ chối: cửa hàng không thể đáp ứng<\/button>/)?.[0] ?? "";

test("đang tải đề xuất: báo đang tải, xác nhận khóa, từ chối vẫn dùng được", () => {
  const html = render();
  assert.match(html, /role="status"[^>]*aria-busy="true"/);
  assert.ok(html.includes("Đang tải đề xuất chuồng…"));
  assert.match(confirmButton(html), / disabled=""/);
  assert.doesNotMatch(rejectButton(html), / disabled=""/);
});

test("có chuồng đề xuất: chuồng chọn sẵn nên xác nhận mở; chỉ một ô chọn, không mời chọn chuồng khác", () => {
  const html = render({ suggestions: { cage: b3 } });
  assert.ok(html.includes("Chuồng phù hợp mèo nhóm Vừa, trống trong cả 2 đêm."));
  assert.ok(!html.includes("Bạn có thể chọn chuồng khác phù hợp."));
  assert.equal((html.match(/type="radio"/g) ?? []).length, 1);
  assert.match(html, /type="radio"[^>]*checked=""/);
  assert.ok(html.includes(">B3<") && html.includes("Hệ thống đề xuất"));
  assert.doesNotMatch(confirmButton(html), / disabled=""/);
  assert.doesNotMatch(rejectButton(html), / disabled=""/);
  assert.ok(!html.includes("<dialog"));
});

test("không còn chuồng phù hợp (cage = null): báo không có chuồng, xác nhận khóa, từ chối vẫn mở", () => {
  const html = render({ suggestions: { cage: null } });
  assert.ok(html.includes("Chưa có chuồng phù hợp để chọn cho lịch này."));
  assert.ok(!html.includes('type="radio"'));
  assert.match(confirmButton(html), / disabled=""/);
  assert.doesNotMatch(rejectButton(html), / disabled=""/);
});

test("tải đề xuất lỗi: hiện lỗi và nút Thử lại; 403 FORBIDDEN hiện không có quyền; từ chối vẫn mở", () => {
  const failed = render({ error: http(409, "INVALID_TRANSITION", "Không thể chuyển lịch hẹn sang trạng thái này ở thời điểm hiện tại.") });
  assert.match(failed, /role="alert"/);
  assert.ok(failed.includes("Không thể chuyển lịch hẹn sang trạng thái này ở thời điểm hiện tại."));
  assert.ok(failed.includes("Thử lại"));
  assert.match(confirmButton(failed), / disabled=""/);
  assert.doesNotMatch(rejectButton(failed), / disabled=""/);
  const forbidden = render({ error: http(403, "FORBIDDEN") });
  assert.ok(forbidden.includes("Bạn không có quyền xem trang này"));
  assert.ok(!forbidden.includes("Thử lại"));
});

test("có danh sách chuồng và thú cưng: hiện chuồng khác cùng loài, khóa chuồng bận hoặc khác cỡ, ẩn chuồng ngừng/khác loài", () => {
  const html = render({
    suggestions: { cage: b3 },
    pet: { petId: "p-may", customerId: "c2", name: "Mây", species: "Cat", weightKg: 4.5, sizeGroup: "Medium", isActive: true },
    cages: [
      b3,
      { cageId: "c4", code: "B4", species: "Cat", sizeGroup: "Medium", isActive: true, occupant: null },
      {
        cageId: "c5",
        code: "B5",
        species: "Cat",
        sizeGroup: "Medium",
        isActive: true,
        occupant: { appointmentId: "other", petName: "Miu", plannedCheckOut: "2026-10-09T10:00:00+07:00" },
      },
      { cageId: "c1", code: "A1", species: "Cat", sizeGroup: "Small", isActive: true, occupant: null },
      { cageId: "c6", code: "B6", species: "Cat", sizeGroup: "Medium", isActive: false, occupant: null },
      { cageId: "c9", code: "D9", species: "Dog", sizeGroup: "Medium", isActive: true, occupant: null },
    ],
  });
  assert.ok(html.includes("Bạn có thể chọn chuồng khác phù hợp."));
  assert.ok(html.includes(">B3<") && html.includes(">B4<") && html.includes(">B5<") && html.includes(">A1<"));
  assert.ok(!html.includes(">B6<") && !html.includes(">D9<"));
  assert.equal((html.match(/type="radio"/g) ?? []).length, 4);
  assert.doesNotMatch(confirmButton(html), / disabled=""/);
});

test("suggestions.cage = null nhưng GET /cages có chuồng trống phù hợp: vẫn chọn được chuồng và bật nút xác nhận", () => {
  const html = render({
    suggestions: { cage: null },
    pet: { petId: "p-may", customerId: "c2", name: "Mây", species: "Cat", weightKg: 4.5, sizeGroup: "Medium", isActive: true },
    cages: [{ cageId: "c4", code: "B4", species: "Cat", sizeGroup: "Medium", isActive: true, occupant: null }],
  });
  assert.ok(html.includes(">B4<"));
  assert.ok(!html.includes("Chưa có chuồng phù hợp để chọn cho lịch này."));
  assert.doesNotMatch(confirmButton(html), / disabled=""/);
});
