import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { apiClient } from "../lib/api/client.ts";
import { listNotifications } from "../lib/api/endpoints/notifications.ts";

const requests = [];
let nextResponse = { status: 200, body: {} };
let originalBaseURL;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

const server = createServer((request, response) => {
  request.on("data", () => {});
  request.on("end", () => {
    const url = new URL(request.url, "http://localhost");
    requests.push({ method: request.method, pathname: url.pathname, query: Object.fromEntries(url.searchParams) });
    response.statusCode = nextResponse.status;
    response.setHeader("Content-Type", nextResponse.status >= 400 ? "application/problem+json" : "application/json");
    response.end(JSON.stringify(nextResponse.body));
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

function reply(status, body) {
  requests.length = 0;
  nextResponse = { status, body };
}

test("listNotifications: GET /notifications gửi page, pageSize và trả đúng trang kèm unread", async () => {
  const body = {
    items: [{ notificationId: "n1", type: "ConfirmedAssigned", appointmentId: "a1", message: "Nội dung", isRead: false, createdAt: "2026-11-28T08:00:00+07:00" }],
    page: 2,
    pageSize: 20,
    total: 21,
    unread: 3,
  };
  reply(200, body);
  const result = await listNotifications({ page: 2, pageSize: 20 });
  assert.deepEqual(result, body);
  assert.deepEqual(requests, [{ method: "GET", pathname: "/api/v1/notifications", query: { page: "2", pageSize: "20" } }]);
});

test("listNotifications: không truyền tham số thì không gửi query", async () => {
  reply(200, { items: [], page: 1, pageSize: 20, total: 0, unread: 0 });
  await listNotifications();
  assert.deepEqual(requests[0].query, {});
});

test("listNotifications: lỗi 403 giữ nguyên status và code của error envelope", async () => {
  reply(403, { status: 403, code: "FORBIDDEN", title: "Không có quyền truy cập", detail: "Bạn không có quyền thực hiện thao tác này." });
  await assert.rejects(listNotifications({ page: 1, pageSize: 20 }), (error) => {
    assert.equal(error.status, 403);
    assert.equal(error.code, "FORBIDDEN");
    return true;
  });
});
