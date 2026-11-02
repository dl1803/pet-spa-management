import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmDialog } from "../components/ui/confirm-dialog.tsx";
import { ServiceTable } from "../features/services/components/service-table.tsx";
import { MOCK_SERVICES } from "../features/services/mock-data.ts";

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
