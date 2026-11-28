import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { apiClient } from "../lib/api/client.ts";
import { ApiError } from "../lib/api/errors.ts";
import { checkInAppointment, respondCostConfirmation, weightCheckAppointment } from "../lib/api/endpoints/appointments.ts";
import {
  forgetPendingCostConfirmation,
  getRememberedPendingCostConfirmation,
  rememberPendingCostConfirmation,
  toPendingCostConfirmation,
} from "../lib/queries/pending-cost-confirmation.ts";

const APPOINTMENT_ID = "1031a003-0000-4000-8000-000000000003";
const NEEDS_CONFIRMATION = {
  result: "NEEDS_CONFIRMATION",
  newSizeGroup: "Medium",
  oldAmount: 150000,
  newAmount: 200000,
  expiresAt: "2026-11-28T03:30:00Z",
};

const requests = [];
let nextResponse = { status: 200, body: null };
let originalBaseURL;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

const server = createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const url = new URL(request.url, "http://localhost");
    requests.push({
      method: request.method,
      pathname: url.pathname,
      contentType: request.headers["content-type"] ?? null,
      body: Buffer.concat(chunks),
    });
    response.statusCode = nextResponse.status;
    if (nextResponse.body === null) {
      response.end();
      return;
    }
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

function reply(status, body = null) {
  requests.length = 0;
  nextResponse = { status, body };
}

const jsonBody = (request) => JSON.parse(request.body.toString("utf8"));

test("checkInAppointment gửi POST /check-in với { actualWeightKg } và trả kết quả đối chiếu", async () => {
  const body = { status: "Received", weightCheck: NEEDS_CONFIRMATION };
  reply(200, body);
  const result = await checkInAppointment({ appointmentId: APPOINTMENT_ID, request: { actualWeightKg: 11.2 } });
  assert.deepEqual(result, body);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].pathname, `/api/v1/appointments/${APPOINTMENT_ID}/check-in`);
  assert.match(requests[0].contentType, /^application\/json/);
  assert.deepEqual(jsonBody(requests[0]), { actualWeightKg: 11.2 });
});

test("weightCheckAppointment gửi POST /weight-check với { actualWeightKg } và trả weightCheck", async () => {
  const body = { weightCheck: { result: "PRICE_DECREASED", newSizeGroup: "Small", oldAmount: 200000, newAmount: 150000 } };
  reply(200, body);
  const result = await weightCheckAppointment({ appointmentId: APPOINTMENT_ID, request: { actualWeightKg: 8 } });
  assert.deepEqual(result, body);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].pathname, `/api/v1/appointments/${APPOINTMENT_ID}/weight-check`);
  assert.deepEqual(jsonBody(requests[0]), { actualWeightKg: 8 });
});

test("respondCostConfirmation gửi POST /cost-confirmation/respond chỉ với { accept }", async () => {
  for (const accept of [true, false]) {
    reply(200, { status: accept ? "Received" : "Cancelled" });
    const result = await respondCostConfirmation({ appointmentId: APPOINTMENT_ID, request: { accept } });
    assert.deepEqual(result, { status: accept ? "Received" : "Cancelled" });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "POST");
    assert.equal(requests[0].pathname, `/api/v1/appointments/${APPOINTMENT_ID}/cost-confirmation/respond`);
    assert.deepEqual(jsonBody(requests[0]), { accept });
  }
});

test("mã lịch được mã hóa trong đường dẫn", async () => {
  reply(200, { weightCheck: { result: "OK" } });
  await weightCheckAppointment({ appointmentId: "a/b c", request: { actualWeightKg: 9 } });
  assert.equal(requests[0].pathname, "/api/v1/appointments/a%2Fb%20c/weight-check");
});

test("lỗi 409 và 404 của ba hàm trả ApiError mang đúng mã nghiệp vụ", async () => {
  const cases = [
    { call: () => checkInAppointment({ appointmentId: APPOINTMENT_ID, request: { actualWeightKg: 9 } }), status: 409, code: "INVALID_TRANSITION" },
    { call: () => checkInAppointment({ appointmentId: APPOINTMENT_ID, request: { actualWeightKg: 9 } }), status: 409, code: "COST_CONFIRMATION_PENDING" },
    { call: () => weightCheckAppointment({ appointmentId: APPOINTMENT_ID, request: { actualWeightKg: 9 } }), status: 409, code: "COST_CONFIRMATION_PENDING" },
    { call: () => respondCostConfirmation({ appointmentId: APPOINTMENT_ID, request: { accept: true } }), status: 404, code: "NOT_FOUND" },
    { call: () => respondCostConfirmation({ appointmentId: APPOINTMENT_ID, request: { accept: true } }), status: 409, code: "COST_CONFIRMATION_EXPIRED" },
  ];
  for (const { call, status, code } of cases) {
    reply(status, { status, code, title: "Lỗi", detail: "Chi tiết" });
    await assert.rejects(call, (error) => error instanceof ApiError && error.status === status && error.code === code);
  }
});

test("lỗi 400 của /check-in trả ApiError VALIDATION_ERROR kèm câu chi tiết của backend", async () => {
  reply(400, { status: 400, code: "VALIDATION_ERROR", title: "Dữ liệu không hợp lệ", detail: "Cân nặng thực tế phải nhỏ hơn 1000 kg." });
  await assert.rejects(
    () => checkInAppointment({ appointmentId: APPOINTMENT_ID, request: { actualWeightKg: 1000 } }),
    (error) => error instanceof ApiError && error.status === 400 && error.detail === "Cân nặng thực tế phải nhỏ hơn 1000 kg.",
  );
});

test("toPendingCostConfirmation: chỉ NEEDS_CONFIRMATION đủ trường mới tạo yêu cầu chờ", () => {
  assert.deepEqual(toPendingCostConfirmation(11.2, NEEDS_CONFIRMATION), {
    actualWeightKg: 11.2,
    newSizeGroup: "Medium",
    oldAmount: 150000,
    newAmount: 200000,
    status: "Pending",
    expiresAt: NEEDS_CONFIRMATION.expiresAt,
  });
  assert.equal(toPendingCostConfirmation(9, { result: "OK" }), null);
  assert.equal(toPendingCostConfirmation(9, { result: "PRICE_DECREASED", newSizeGroup: "Small", oldAmount: 2, newAmount: 1 }), null);
  assert.equal(toPendingCostConfirmation(9, { result: "NEEDS_CONFIRMATION", newSizeGroup: "Medium" }), null);
  assert.equal(toPendingCostConfirmation(9, { ...NEEDS_CONFIRMATION, oldAmount: null }), null);
});

test("bộ nhớ yêu cầu xác nhận: nhớ theo mã lịch, bỏ qua kết quả không cần xác nhận, quên khi được yêu cầu", () => {
  rememberPendingCostConfirmation("a", 11.2, NEEDS_CONFIRMATION);
  rememberPendingCostConfirmation("b", 9, { result: "OK" });
  assert.equal(getRememberedPendingCostConfirmation("a")?.newAmount, 200000);
  assert.equal(getRememberedPendingCostConfirmation("b"), null);
  forgetPendingCostConfirmation("a");
  assert.equal(getRememberedPendingCostConfirmation("a"), null);
});
