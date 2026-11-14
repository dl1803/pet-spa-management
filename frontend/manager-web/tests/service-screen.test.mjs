import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/feedback/toast.tsx";
import { ConfirmDialog } from "../components/ui/confirm-dialog.tsx";
import { ServiceTable } from "../features/services/components/service-table.tsx";
import { ServicesScreen } from "../features/services/screens/services-screen.tsx";
import { ApiError } from "../lib/api/errors.ts";
import { serviceKeys } from "../lib/queries/services.ts";
import { MOCK_SERVICES } from "./fixtures/services.ts";

const noop = () => {};
const count = (html, pattern) => (html.match(pattern) ?? []).length;

test("bảng dịch vụ: 6 dòng, nhãn trạng thái, giá từ, nút theo trạng thái", () => {
  const html = renderToStaticMarkup(
    React.createElement(ServiceTable, { services: MOCK_SERVICES, onEdit: noop, onStop: noop, onReopen: noop }),
  );
  assert.equal(count(html, /<tr\b/g), 7);
  assert.equal(count(html, /Đang cung cấp<\/span>/g), 5);
  assert.equal(count(html, /Đã ngừng<\/span>/g), 1);
  for (const price of ["90.000đ", "120.000đ", "40.000đ", "80.000đ", "300.000đ", "250.000đ"]) assert.ok(html.includes(price), price);
  assert.equal(count(html, /aria-label="Sửa dịch vụ /g), 6);
  assert.equal(count(html, /aria-label="Ngừng dịch vụ /g), 5);
  assert.equal(count(html, /aria-label="Mở lại dịch vụ Nhuộm lông tạo màu"/g), 1);
  assert.ok(html.includes('aria-label="Chó, Mèo, Thỏ, Chuột lang"'));
  assert.ok(html.includes('aria-label="Chó"'));
});

test("hộp thoại ngừng dịch vụ: tiêu đề, hậu quả, nút Quay lại và Ngừng cung cấp", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      ConfirmDialog,
      {
        icon: "ban",
        title: "Ngừng cung cấp dịch vụ này?",
        description: "Bạn có thể mở lại bất cứ lúc nào.",
        confirmLabel: "Ngừng cung cấp",
        onConfirm: noop,
        onCancel: noop,
      },
      React.createElement("p", null, "Dịch vụ sẽ không còn hiển thị khi khách hàng và lễ tân đặt lịch mới."),
    ),
  );
  assert.match(html, /<dialog\b[^>]*aria-labelledby=/);
  assert.ok(html.indexOf("Quay lại") < html.indexOf("Ngừng cung cấp</button>"));
  assert.ok(html.includes("Dịch vụ sẽ không còn hiển thị khi khách hàng và lễ tân đặt lịch mới."));
});

// Dựng màn với bộ đệm Query có sẵn dữ liệu hoặc lỗi; render phía server không gọi API.
// retryOnMount: false để truy vấn đang ở trạng thái lỗi không bị coi là “đang tải lại” khi render.
function renderScreen({ data, error } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  if (data !== undefined) client.setQueryData(serviceKeys.list(), data);
  if (error !== undefined) {
    const query = client.getQueryCache().build(client, { queryKey: serviceKeys.list() });
    query.setState({ ...query.state, status: "error", fetchStatus: "idle", error, errorUpdatedAt: Date.now() });
  }
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client }, React.createElement(ToastProvider, null, React.createElement(ServicesScreen))),
  );
}

test("màn dịch vụ đang tải lần đầu: báo đang tải, chưa có nút Thêm dịch vụ", () => {
  const html = renderScreen();
  assert.ok(html.includes("Đang tải danh sách dịch vụ…"));
  assert.match(html, /role="status"[^>]*aria-busy="true"/);
  assert.ok(!html.includes("Thêm dịch vụ"));
  assert.equal(count(html, /<table\b/g), 0);
});

test("màn dịch vụ có dữ liệu từ server: số lượng, bảng và nút Thêm dịch vụ", () => {
  const html = renderScreen({ data: MOCK_SERVICES });
  assert.ok(html.includes("5 dịch vụ đang cung cấp, 1 đã ngừng."));
  assert.equal(count(html, /<tr\b/g), 7);
  assert.ok(html.includes("Thêm dịch vụ"));
  assert.ok(html.includes("Dịch vụ đã ngừng không còn hiển thị khi khách đặt lịch mới."));
});

test("màn dịch vụ rỗng: hiện trạng thái rỗng thay vì bảng", () => {
  const html = renderScreen({ data: [] });
  assert.ok(html.includes("Chưa có dịch vụ nào"));
  assert.ok(html.includes("0 dịch vụ đang cung cấp, 0 đã ngừng."));
  assert.equal(count(html, /<table\b/g), 0);
  assert.ok(html.includes("Thêm dịch vụ"));
});

test("màn dịch vụ lỗi khi tải: 403 hiện ForbiddenState; lỗi khác hiện cảnh báo và nút Thử lại", () => {
  const forbidden = renderScreen({ error: new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" }) });
  assert.ok(forbidden.includes("Bạn không có quyền xem trang này"));
  assert.ok(!forbidden.includes("Thử lại"));
  assert.ok(!forbidden.includes("Thêm dịch vụ"));

  const failed = renderScreen({ error: new ApiError({ kind: "http", status: 500, detail: "private database error" }) });
  assert.match(failed, /role="alert"/);
  assert.ok(failed.includes("Có lỗi xảy ra, vui lòng thử lại sau."));
  assert.ok(!failed.includes("private database error"));
  assert.ok(failed.includes("Thử lại"));
  assert.ok(!failed.includes("Thêm dịch vụ"));
  assert.equal(count(failed, /<table\b/g), 0);
});

test("bảng dịch vụ: dòng đang đổi trạng thái bị khóa nút Ngừng / Mở lại, dòng khác không", () => {
  const [, cutTia, , , , stopped] = MOCK_SERVICES;
  const html = renderToStaticMarkup(
    React.createElement(ServiceTable, { services: [cutTia, stopped], onEdit: noop, onStop: noop, onReopen: noop, pendingServiceId: cutTia.serviceId }),
  );
  const buttonOf = (label) => html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? "";
  assert.ok(buttonOf("Ngừng dịch vụ Cắt tỉa lông").includes('disabled=""'));
  assert.ok(!buttonOf("Sửa dịch vụ Cắt tỉa lông").includes('disabled=""'));
  assert.ok(buttonOf("Mở lại dịch vụ Nhuộm lông tạo màu").length > 0);
  assert.ok(!buttonOf("Mở lại dịch vụ Nhuộm lông tạo màu").includes('disabled=""'));
});
