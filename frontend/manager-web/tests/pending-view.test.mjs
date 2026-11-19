import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { PendingList } from "../features/pending/components/pending-list.tsx";
import { PendingView } from "../features/pending/components/pending-view.tsx";
import { ApiError } from "../lib/api/errors.ts";
import { appointmentKeys, PENDING_PAGE_SIZE } from "../lib/queries/appointments.ts";
import { petKeys } from "../lib/queries/pets.ts";

const noop = () => {};
const PENDING_PARAMS = { status: "Pending", page: 1, pageSize: PENDING_PAGE_SIZE };
const MOCHI_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01";
const MAY_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03";

const mochi = {
  appointmentId: MOCHI_ID, type: "Spa", customerId: "c1", petId: "p-mochi", petName: "Mochi", status: "Pending",
  sizeGroup: "Medium", slotStart: "2026-10-06T14:00:00+07:00", slotEnd: "2026-10-06T16:00:00+07:00", staffRequired: 1,
  createdAt: "2026-10-05T08:00:00+07:00", updatedAt: "2026-10-05T08:00:00+07:00",
};
const may = {
  appointmentId: MAY_ID, type: "Hotel", customerId: "c2", petId: "p-may", petName: "Mây", status: "Pending",
  sizeGroup: "Medium", plannedCheckIn: "2026-10-08T09:00:00+07:00", plannedCheckOut: "2026-10-10T17:00:00+07:00",
  createdAt: "2026-10-05T09:00:00+07:00", updatedAt: "2026-10-05T09:00:00+07:00",
};
const mochiPet = {
  petId: "p-mochi", customerId: "c1", name: "Mochi", species: "Cat", breed: "Anh lông ngắn", temperament: "Calm",
  weightKg: 4.2, heightCm: null, coatNote: null, notes: null, sizeGroup: "Medium", isActive: true,
};

// Render phía server không gọi API: bộ đệm Query có sẵn dữ liệu hoặc lỗi.
function setError(client, queryKey, error) {
  const query = client.getQueryCache().build(client, { queryKey });
  query.setState({ ...query.state, status: "error", fetchStatus: "idle", error, errorUpdatedAt: Date.now() });
}

function renderView({ page, listError, pets = {}, petErrors = {}, suggestions = {}, type = "all", requestedId = null } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  if (page !== undefined) client.setQueryData(appointmentKeys.list(PENDING_PARAMS), page);
  if (listError !== undefined) setError(client, appointmentKeys.list(PENDING_PARAMS), listError);
  for (const [petId, pet] of Object.entries(pets)) client.setQueryData(petKeys.detail(petId), pet);
  for (const [petId, error] of Object.entries(petErrors)) setError(client, petKeys.detail(petId), error);
  for (const [appointmentId, data] of Object.entries(suggestions)) client.setQueryData(appointmentKeys.suggestions(appointmentId), data);
  return renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(ToastProvider, null, React.createElement(PendingView, { type, requestedId, onTypeChange: noop, onSelect: noop })),
    ),
  );
}

const pageOf = (items, total = items.length) => ({ items, page: 1, pageSize: PENDING_PAGE_SIZE, total });

test("đang tải lần đầu: báo đang tải, chưa có nhóm nút loại lịch", () => {
  const html = renderView();
  assert.ok(html.includes("Lịch hẹn chờ xác nhận"));
  assert.ok(html.includes("Đang tải danh sách lịch chờ xác nhận…"));
  assert.match(html, /role="status"[^>]*aria-busy="true"/);
  assert.ok(!html.includes("Tất cả"));
});

test("lỗi tải danh sách: hiện lỗi và nút Thử lại; 403 FORBIDDEN hiện trạng thái không có quyền", () => {
  const failed = renderView({ listError: new ApiError({ kind: "http", status: 500 }) });
  assert.match(failed, /role="alert"/);
  assert.ok(failed.includes("Có lỗi xảy ra, vui lòng thử lại sau."));
  assert.ok(failed.includes("Thử lại"));
  const forbidden = renderView({ listError: new ApiError({ kind: "http", status: 403, code: "FORBIDDEN", title: "x" }) });
  assert.ok(forbidden.includes("Bạn không có quyền xem trang này"));
  assert.ok(!forbidden.includes("Thử lại"));
});

test("không có lịch chờ: trạng thái trống, không có danh sách", () => {
  const html = renderView({ page: pageOf([]) });
  assert.ok(html.includes("Không còn lịch chờ xác nhận."));
  assert.ok(html.includes("Spa 0, lưu trú 0."));
  assert.ok(!html.includes("<ul"));
});

test("có dữ liệu: tiêu đề phụ, sắp theo giờ hẹn, lịch đầu tiên được chọn và hiện hồ sơ thú cưng", () => {
  const html = renderView({ page: pageOf([may, mochi]), pets: { "p-mochi": mochiPet } });
  assert.ok(html.includes("Spa 1, lưu trú 1. Xử lý theo thứ tự giờ hẹn gần nhất."));
  assert.ok(html.indexOf("Mochi") < html.indexOf("Mây"), "Mochi hẹn 06/10 đứng trước Mây nhận 08/10");
  assert.equal((html.match(/aria-current="true"/g) ?? []).length, 1);
  assert.ok(html.includes("Mochi, mèo Anh lông ngắn, nhóm Vừa"));
  assert.ok(html.includes("14:00 – 16:00, 06/10"));
  assert.ok(html.includes("Số nhân viên cần"));
  assert.ok(html.includes("Hồ sơ thú cưng"));
  assert.ok(html.includes("4,2 kg"));
  assert.ok(html.includes("Hiền"));
  assert.ok(html.includes("Chờ xác nhận</span>"));
});

test("không hiển thị dữ liệu API chưa có", () => {
  const html = renderView({ page: pageOf([mochi]), pets: { "p-mochi": mochiPet } });
  for (const text of ["Tạm tính", "Dịch vụ", "có tài khoản", "khách vãng lai"]) {
    assert.ok(!html.includes(text), text);
  }
});

const mochiSuggestions = {
  staffRequired: 1,
  suggested: [{ staffId: "s-tam", fullName: "Lê Minh Tâm", recentAssignmentCount: 5 }],
  alternatives: [{ staffId: "s-hanh", fullName: "Nguyễn Thị Hạnh", recentAssignmentCount: 6 }],
};

test("lịch spa đang chọn: hiện vùng nhân viên từ đề xuất thật và hai nút xác nhận, từ chối", () => {
  const html = renderView({ page: pageOf([mochi]), pets: { "p-mochi": mochiPet }, suggestions: { [MOCHI_ID]: mochiSuggestions } });
  assert.ok(html.includes("Nhân viên spa phụ trách, cần 1 người"));
  assert.ok(html.includes("Lê Minh Tâm") && html.includes("Nguyễn Thị Hạnh"));
  assert.ok(html.includes("Từ chối: cửa hàng không thể đáp ứng"));
  assert.ok(html.includes("Xác nhận lịch hẹn"));
});

test("lịch lưu trú đang chọn: hiện vùng chuồng từ đề xuất thật và hai nút xác nhận, từ chối", () => {
  const cage = { cageId: "c3", code: "B3", species: "Cat", sizeGroup: "Medium", isActive: true };
  const html = renderView({ page: pageOf([may]), requestedId: MAY_ID, suggestions: { [MAY_ID]: { cage } } });
  assert.ok(html.includes("Chuồng phù hợp mèo nhóm Vừa, trống trong cả 2 đêm."));
  assert.ok(html.includes(">B3<"));
  assert.ok(html.includes("Từ chối: cửa hàng không thể đáp ứng"));
  assert.ok(html.includes("Xác nhận lịch lưu trú"));
  for (const text of ["Nhân viên spa phụ trách", "Đang tải đề xuất nhân viên", "Xác nhận lịch hẹn<"]) {
    assert.ok(!html.includes(text), text);
  }
});

test("lịch lưu trú đang chọn, đề xuất đang tải: báo đang tải đề xuất chuồng", () => {
  const html = renderView({ page: pageOf([may]), requestedId: MAY_ID });
  assert.ok(html.includes("Đang tải đề xuất chuồng…"));
  assert.ok(!html.includes("Đang tải đề xuất nhân viên"));
});

test("lịch được yêu cầu chọn theo URL; mã không có trong danh sách thì chọn lịch đầu tiên", () => {
  const pets = { "p-mochi": mochiPet };
  const picked = renderView({ page: pageOf([mochi, may]), pets, requestedId: MAY_ID });
  assert.ok(picked.includes("Nhận"));
  assert.ok(picked.includes("2 đêm"));
  assert.ok(!picked.includes("Số nhân viên cần"));
  const fallback = renderView({ page: pageOf([mochi, may]), pets, requestedId: "khong-co" });
  assert.ok(fallback.includes("Số nhân viên cần"));
});

test("lọc theo loại: chỉ lịch thuộc loại đó; loại không có lịch thì báo trống trong danh sách", () => {
  const onlySpa = renderView({ page: pageOf([mochi]), type: "Hotel" });
  assert.ok(onlySpa.includes("Không có lịch nào thuộc loại này đang chờ xác nhận."));
  assert.ok(onlySpa.includes("Spa 1, lưu trú 0."));
  const hotelOnly = renderView({ page: pageOf([mochi, may]), type: "Hotel" });
  assert.ok(hotelOnly.includes("Mây") && !hotelOnly.includes("14:00 – 16:00"));
  assert.match(hotelOnly, /aria-pressed="true"[^>]*>Lưu trú/);
});

test("hồ sơ thú cưng đang tải, lỗi 404 hoặc đã bị gỡ: không che thông tin lịch hẹn", () => {
  const loading = renderView({ page: pageOf([mochi]) });
  assert.ok(loading.includes("Đang tải hồ sơ thú cưng…"));
  assert.ok(loading.includes("14:00 – 16:00, 06/10"));
  assert.ok(loading.includes("Mochi, nhóm Vừa"));
  const missing = renderView({
    page: pageOf([mochi]),
    petErrors: { "p-mochi": new ApiError({ kind: "http", status: 404, code: "NOT_FOUND", title: "Không tìm thấy", detail: "Không tìm thấy dữ liệu được yêu cầu." }) },
  });
  assert.ok(missing.includes("Không tìm thấy dữ liệu được yêu cầu."));
  assert.ok(missing.includes("Thử lại"));
  assert.ok(missing.includes("14:00 – 16:00, 06/10"));
  const removed = renderView({ page: pageOf([mochi]), pets: { "p-mochi": { ...mochiPet, isActive: false } } });
  assert.ok(removed.includes("Khách đã gỡ hồ sơ thú cưng này."));
  assert.ok(removed.includes("4,2 kg"));
});

test("tổng số lịch lớn hơn số lịch đã tải: có cảnh báo, không giả vờ đã hiển thị đủ", () => {
  const html = renderView({ page: pageOf([mochi], 73), pets: { "p-mochi": mochiPet } });
  assert.ok(html.includes("Có 73 lịch chờ xác nhận, đang hiển thị 1 lịch đầu tiên."));
});

test("danh sách phiếu: mỗi lịch một nút, chỉ lịch đang chọn có aria-current", () => {
  const html = renderToStaticMarkup(React.createElement(PendingList, { appointments: [mochi, may], selectedId: MAY_ID, onSelect: noop }));
  assert.equal((html.match(/<button\b/g) ?? []).length, 2);
  assert.equal((html.match(/aria-current="true"/g) ?? []).length, 1);
  assert.ok(html.includes("→ 10/10"));
  assert.ok(html.includes("LH-5F1C2A9B"));
});
