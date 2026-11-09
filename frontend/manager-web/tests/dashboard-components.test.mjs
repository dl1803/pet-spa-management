// tests/dashboard-components.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AttentionList } from "../features/dashboard/components/attention-list.tsx";
import { KpiSummary } from "../features/dashboard/components/kpi-summary.tsx";
import { OccupiedCages } from "../features/dashboard/components/occupied-cages.tsx";
import { StaffTimeline } from "../features/dashboard/components/staff-timeline.tsx";
import { DashboardScreen } from "../features/dashboard/screens/dashboard-screen.tsx";
import { MOCK_DASHBOARD } from "../features/dashboard/mock-data.ts";
import { buildAttentionItems, listOccupiedCages } from "../features/dashboard/overview.ts";

const count = (html, pattern) => (html.match(pattern) ?? []).length;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

test("KpiSummary: 4 thẻ đúng thứ tự; chỉ thẻ có trang đích mới là liên kết", () => {
  const html = render(KpiSummary, { snapshot: MOCK_DASHBOARD });
  for (const text of ["Chờ xác nhận", "Lịch spa hôm nay", "Chuồng đang chứa", "Khoản chưa thanh toán"]) assert.ok(html.includes(text), text);
  assert.ok(html.includes("3 / 11") && html.includes("690.000đ, đều là tiền lưu trú"));
  assert.equal(count(html, /<a /g), 2);
  assert.match(html, /<a [^>]*href="\/cho-xac-nhan"/);
  assert.match(html, /<a [^>]*href="\/thanh-toan"/);
  assert.equal(count(html, /bg-apricot-50/g), 1);
});

test("KpiSummary: không còn lịch chờ thì thẻ Chờ xác nhận không tô nền Apricot", () => {
  const html = render(KpiSummary, { snapshot: { ...MOCK_DASHBOARD, pendingCounts: { spa: 0, hotel: 0 } } });
  assert.equal(count(html, /bg-apricot-50/g), 0);
});

test("StaffTimeline: 4 hàng, 6 khối là liên kết tới chi tiết lịch, nhãn giờ 08–20, vạch hiện tại và chú thích", () => {
  const html = render(StaffTimeline, { snapshot: MOCK_DASHBOARD });
  assert.equal(count(html, /<li /g), 4);
  assert.equal(count(html, /data-status="/g), 6);
  for (const status of ["Pending", "Confirmed", "Received", "InProgress"]) assert.ok(html.includes(`data-status="${status}"`), status);
  assert.equal(count(html, /<a [^>]*href="\/lich-hen\//g), 6);
  assert.ok(html.includes('aria-label="Bông, Đã tiếp nhận, 09:00 – 11:00. Mở chi tiết LH-5F1C0405"'));
  for (const label of ["08", "12", "20"]) assert.ok(html.includes(`>${label}</span>`), label);
  assert.equal(count(html, /data-now/g), 4);
  assert.equal(count(html, /data-past/g), 4);
  assert.equal(count(html, /data-shift/g), 3);
  assert.equal(count(html, /data-buffer/g), 6);
  assert.ok(html.includes(">09:20</span>") && html.includes("Hiện tại, 09:20"));
  for (const text of ["Hạnh", "Quyên", "Tâm", "Chưa phân công", "Ca làm", "08:00 - 21:00"]) assert.ok(html.includes(text), text);
  assert.ok(html.includes("Đã xác nhận") && html.includes("Đang thực hiện") && html.includes("Chờ xác nhận"));
});

test("StaffTimeline: ngoài khung giờ biểu đồ thì không vẽ vạch hiện tại và không tô mờ", () => {
  const html = render(StaffTimeline, { snapshot: { ...MOCK_DASHBOARD, now: "2026-10-06T22:00:00+07:00" } });
  assert.equal(count(html, /data-now/g), 0);
  assert.equal(count(html, /data-past/g), 0);
  assert.ok(!html.includes("Hiện tại,"));
});

test("AttentionList: mục có liên kết là <a>, mục chưa có trang đích là chữ; rỗng thì có câu thông báo", () => {
  const html = render(AttentionList, { items: buildAttentionItems(MOCK_DASHBOARD) });
  assert.ok(html.includes("Cần chú ý") && html.includes("Bông chờ khách xác nhận chi phí"));
  assert.equal(count(html, /<li>/g), 3);
  assert.equal(count(html, /<a /g), 1);
  assert.ok(render(AttentionList, { items: [] }).includes("Hiện không có việc cần chú ý."));
});

test("OccupiedCages: danh sách chuồng, không có liên kết; rỗng thì có câu thông báo", () => {
  const html = render(OccupiedCages, { cages: listOccupiedCages(MOCK_DASHBOARD) });
  assert.ok(html.includes("Chuồng đang chứa") && html.includes("B1, Tuyết") && html.includes("Trả 17:00 ngày 07/10"));
  assert.equal(count(html, /<li /g), 3);
  assert.equal(count(html, /<a /g), 0);
  assert.ok(render(OccupiedCages, { cages: [] }).includes("Hiện không có chuồng nào đang chứa thú cưng."));
});

test("DashboardScreen: tiêu đề, dòng cập nhật, đủ 5 vùng và không có thao tác ghi", () => {
  const html = render(DashboardScreen, {});
  assert.ok(html.includes("<h1>Tổng quan hôm nay</h1>") && html.includes("Thứ ba 06/10/2026. Cập nhật lúc 09:20."));
  for (const text of ["Số liệu hôm nay", "Tiến độ spa theo nhân viên", "Cần chú ý", "Chuồng đang chứa"]) assert.ok(html.includes(text), text);
  assert.equal(count(html, /<button/g), 0);
  assert.ok(!html.includes("Tất cả lịch hẹn"));
});
