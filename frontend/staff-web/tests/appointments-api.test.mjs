import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { apiClient } from "../lib/api/client.ts";
import { ApiError, isForbiddenError } from "../lib/api/errors.ts";
import { getAppointment, listAppointments } from "../lib/api/endpoints/appointments.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";

const requests = [];
let nextResponse = { status: 200, body: {} };
let originalBaseURL;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

const server = createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const url = new URL(request.url, "http://localhost");
    const raw = Buffer.concat(chunks).toString("utf8");
    requests.push({
      method: request.method,
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body: raw === "" ? null : JSON.parse(raw),
    });
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

test("listAppointments gửi GET /api/v1/appointments với query đúng và trả đúng trang phản hồi", async () => {
  const page = { items: [], page: 1, pageSize: 100, total: 0 };
  reply(200, page);
  const result = await listAppointments({ type: "Spa", status: "Confirmed", page: 1, pageSize: 100 });
  assert.deepEqual(result, page);
  assert.deepEqual(requests, [
    {
      method: "GET",
      pathname: "/api/v1/appointments",
      query: { type: "Spa", status: "Confirmed", page: "1", pageSize: "100" },
      body: null,
    },
  ]);
});

test("listAppointments không gửi tham số khi không truyền", async () => {
  const page = { items: [], page: 1, pageSize: 100, total: 0 };
  reply(200, page);
  const result = await listAppointments({});
  assert.deepEqual(result, page);
  assert.deepEqual(requests, [
    {
      method: "GET",
      pathname: "/api/v1/appointments",
      query: {},
      body: null,
    },
  ]);
});

test("getAppointment('a b/c') gọi GET /api/v1/appointments/a%20b%2Fc và trả chi tiết", async () => {
  const detail = { appointmentId: "a b/c", type: "Spa", customerId: "c1", petId: "p1", status: "Confirmed", sizeGroup: "Small", createdAt: "2026-11-20T00:00:00Z", updatedAt: "2026-11-20T00:00:00Z" };
  reply(200, detail);
  const result = await getAppointment("a b/c");
  assert.deepEqual(result, detail);
  assert.deepEqual(requests, [
    {
      method: "GET",
      pathname: "/api/v1/appointments/a%20b%2Fc",
      query: {},
      body: null,
    },
  ]);
});

test("getAppointment khi server trả 403 với problem+json thì bị từ chối bằng ApiError và isForbiddenError === true", async () => {
  reply(403, { code: "FORBIDDEN", title: "Forbidden" });
  await assert.rejects(
    () => getAppointment("forbidden-id"),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(isForbiddenError(error), true);
      return true;
    },
  );
});

test("getAppointment khi server trả 404 thì ApiError có status === 404", async () => {
  reply(404, { code: "NOT_FOUND", title: "Not Found" });
  await assert.rejects(
    () => getAppointment("missing-id"),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 404);
      return true;
    },
  );
});

test("appointmentKeys: all, list, detail có đúng cấu trúc", () => {
  assert.deepEqual(appointmentKeys.all, ["appointments"]);
  assert.deepEqual(appointmentKeys.list({ status: "Confirmed" }), ["appointments", "list", { status: "Confirmed" }]);
  assert.deepEqual(appointmentKeys.detail("x"), ["appointments", "detail", "x"]);
});
