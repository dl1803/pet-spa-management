import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { SpaAssignment } from "../features/pending/components/spa-assignment.tsx";
import { ApiError } from "../lib/api/errors.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01";
const tam = { staffId: "a", fullName: "Lê Minh Tâm", recentAssignmentCount: 5 };
const hanh = { staffId: "b", fullName: "Nguyễn Thị Hạnh", recentAssignmentCount: 6 };
const appointment = {
  appointmentId: ID, type: "Spa", customerId: "c1", petId: "p1", status: "Pending", sizeGroup: "Medium", staffRequired: 1,
  createdAt: "2026-10-05T08:00:00+07:00", updatedAt: "2026-10-05T08:00:00+07:00",
};
const http = (status, code, detail) => new ApiError({ kind: "http", status, code, title: "Lỗi", detail });

function render({ suggestions, error } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  if (suggestions !== undefined) client.setQueryData(appointmentKeys.suggestions(ID), suggestions);
  if (error !== undefined) {
    const query = client.getQueryCache().build(client, { queryKey: appointmentKeys.suggestions(ID) });
    query.setState({ ...query.state, status: "error", fetchStatus: "idle", error, errorUpdatedAt: Date.now() });
  }
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(ToastProvider, null, React.createElement(SpaAssignment, { appointment, onProcessed() {} })),
    ),
  );
}

const confirmButton = (html) => html.match(/<button[^>]*>Xác nhận lịch hẹn<\/button>/)?.[0] ?? "";
const rejectButton = (html) => html.match(/<button[^>]*>(?:(?!<\/button>).)*Từ chối: cửa hàng không thể đáp ứng<\/button>/)?.[0] ?? "";

test("đang tải đề xuất: báo đang tải, xác nhận khóa, từ chối vẫn dùng được", () => {
  const html = render();
  assert.match(html, /role="status"[^>]*aria-busy="true"/);
  assert.ok(html.includes("Đang tải đề xuất nhân viên…"));
  assert.match(confirmButton(html), / disabled=""/);
  assert.doesNotMatch(rejectButton(html), / disabled=""/);
});

test("có đề xuất: người được đề xuất chọn sẵn nên xác nhận mở; từ chối mở", () => {
  const html = render({ suggestions: { staffRequired: 1, suggested: [tam], alternatives: [hanh] } });
  assert.ok(html.includes("Nhân viên spa phụ trách, cần 1 người"));
  assert.ok(html.includes("Đã chọn 1 / 1"));
  assert.doesNotMatch(confirmButton(html), / disabled=""/);
  assert.doesNotMatch(rejectButton(html), / disabled=""/);
  assert.ok(!html.includes("<dialog"));
});

test("không có nhân viên phù hợp: xác nhận khóa, từ chối vẫn mở", () => {
  const html = render({ suggestions: { staffRequired: 1, suggested: [], alternatives: [] } });
  assert.ok(html.includes("Chưa có nhân viên phù hợp để chọn cho lịch này."));
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
