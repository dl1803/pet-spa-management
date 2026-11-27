import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { loadCompletedSpaAppointments } from "../features/work-history/load-history.ts";
import { apiClient } from "../lib/api/client.ts";

const requests = [];
let total = 0;
let duplicateAcrossPages = false;
let failOnPage = null;
let originalBaseURL;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

const appointment = (index) => ({
  appointmentId: `a0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  type: "Spa",
  customerId: "c1",
  petId: "b1",
  petName: "Bông",
  status: "Completed",
  sizeGroup: "Small",
  slotStart: "2026-11-01T09:00:00+07:00",
  slotEnd: "2026-11-01T10:00:00+07:00",
  createdAt: "2026-10-01T09:00:00+07:00",
  updatedAt: "2026-11-01T10:00:00+07:00",
});

const server = createServer((request, response) => {
  request.on("data", () => {});
  request.on("end", () => {
    const url = new URL(request.url, "http://localhost");
    const query = Object.fromEntries(url.searchParams);
    requests.push({ method: request.method, pathname: url.pathname, query });
    const page = Number(query.page);
    const pageSize = Number(query.pageSize);
    if (failOnPage === page) {
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify({ status: 500, title: "Lỗi" }));
      return;
    }
    const first = (page - 1) * pageSize;
    const items = Array.from({ length: Math.max(0, Math.min(pageSize, total - first)) }, (_, index) => appointment(first + index + 1));
    // Mô phỏng lịch mới hoàn tất giữa hai lần tải: dòng đầu trang 2 trùng dòng cuối trang 1.
    if (duplicateAcrossPages && page === 2 && items.length > 0) items[0] = appointment(first);
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ items, page, pageSize, total }));
  });
});

before(async () => {
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true, writable: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  originalBaseURL = apiClient.defaults.baseURL;
  apiClient.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  apiClient.defaults.baseURL = originalBaseURL;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete globalThis.window;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function arrange(options) {
  requests.length = 0;
  total = options.total;
  duplicateAcrossPages = options.duplicateAcrossPages ?? false;
  failOnPage = options.failOnPage ?? null;
}

test("loadCompletedSpaAppointments: tải đủ 3 trang, mỗi trang 100, chỉ lọc type=Spa và status=Completed", async () => {
  arrange({ total: 250 });
  const result = await loadCompletedSpaAppointments();
  assert.equal(result.length, 250);
  assert.deepEqual(
    requests.map((item) => item.query),
    [1, 2, 3].map((page) => ({ type: "Spa", status: "Completed", page: String(page), pageSize: "100" })),
  );
  assert.ok(requests.every((item) => item.method === "GET" && item.pathname === "/api/v1/appointments"));
});

test("loadCompletedSpaAppointments: đúng 100 lịch thì chỉ một lần gọi, không có lịch thì trả mảng rỗng", async () => {
  arrange({ total: 100 });
  assert.equal((await loadCompletedSpaAppointments()).length, 100);
  assert.equal(requests.length, 1);
  arrange({ total: 0 });
  assert.deepEqual(await loadCompletedSpaAppointments(), []);
  assert.equal(requests.length, 1);
});

test("loadCompletedSpaAppointments: dòng trùng giữa hai trang chỉ giữ một", async () => {
  arrange({ total: 150, duplicateAcrossPages: true });
  const result = await loadCompletedSpaAppointments();
  assert.equal(new Set(result.map((item) => item.appointmentId)).size, result.length);
  assert.equal(result.length, 149);
});

test("loadCompletedSpaAppointments: một trang lỗi thì cả lần tải báo lỗi, giữ nguyên status", async () => {
  arrange({ total: 250, failOnPage: 2 });
  await assert.rejects(loadCompletedSpaAppointments(), (error) => {
    assert.equal(error.status, 500);
    return true;
  });
});
