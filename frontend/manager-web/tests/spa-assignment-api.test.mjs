import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { confirmAppointment, getSuggestions, rejectAppointment } from "../lib/api/endpoints/appointments.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01";
const STAFF = "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f01";
const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

function problem(response, status, code, detail) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/problem+json");
  response.end(JSON.stringify({ status, code, title: "Lỗi", detail }));
}

const server = createServer((incoming, response) => {
  let body = "";
  incoming.on("data", (chunk) => { body += chunk; });
  incoming.on("end", () => {
    const { method, url } = incoming;
    requests.push({ method, url, authorization: incoming.headers.authorization ?? null, body: body ? JSON.parse(body) : null });
    response.setHeader("Content-Type", "application/json");
    if (method === "GET" && url === `/api/v1/appointments/${ID}/suggestions`) {
      response.end(JSON.stringify({ staffRequired: 1, suggested: [{ staffId: STAFF, fullName: "Lê Minh Tâm", recentAssignmentCount: 5 }], alternatives: [] }));
    } else if (method === "POST" && url === `/api/v1/appointments/${ID}/confirm`) {
      const request = JSON.parse(body);
      if (request.confirmOutOfShift === true) response.end(JSON.stringify({ status: "Confirmed" }));
      else problem(response, 409, "STAFF_OUT_OF_SHIFT", "Nhân viên không có ca làm phủ khung giờ này: Lê Minh Tâm.");
    } else if (method === "POST" && url === `/api/v1/appointments/${ID}/reject`) {
      response.end(JSON.stringify({ status: "Cancelled", reason: "StoreUnable" }));
    } else {
      problem(response, 404, "NOT_FOUND", "Không tìm thấy dữ liệu được yêu cầu.");
    }
  });
});

before(async () => {
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true, writable: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  apiClient.defaults.baseURL = `http://127.0.0.1:${server.address().port}/api/v1`;
  setAccessTokenProvider(() => "manager-token");
});

after(async () => {
  setAccessTokenProvider(() => null);
  apiClient.defaults.baseURL = originalBaseURL;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete globalThis.window;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test("khóa query đề xuất nằm dưới khóa gốc lịch hẹn để làm mới cùng danh sách", () => {
  assert.deepEqual(appointmentKeys.suggestions(ID), ["appointments", "detail", ID, "suggestions"]);
  assert.deepEqual(appointmentKeys.suggestions(ID).slice(0, 1), appointmentKeys.all);
});

test("getSuggestions: GET /appointments/{id}/suggestions kèm Bearer", async () => {
  requests.length = 0;
  const data = await getSuggestions(ID);
  assert.deepEqual(requests, [{ method: "GET", url: `/api/v1/appointments/${ID}/suggestions`, authorization: "Bearer manager-token", body: null }]);
  assert.equal(data.staffRequired, 1);
  assert.equal(data.suggested[0].staffId, STAFF);
});

test("confirmAppointment: gửi đúng { staffIds }, không thêm trường nào khác", async () => {
  requests.length = 0;
  await assert.rejects(confirmAppointment(ID, { staffIds: [STAFF] }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "STAFF_OUT_OF_SHIFT");
    return true;
  });
  assert.deepEqual(requests[0].body, { staffIds: [STAFF] });
  assert.equal(requests[0].authorization, "Bearer manager-token");
});

test("confirmAppointment: gửi lại với confirmOutOfShift = true thì thành công", async () => {
  requests.length = 0;
  await confirmAppointment(ID, { staffIds: [STAFF], confirmOutOfShift: true });
  assert.deepEqual(requests, [
    { method: "POST", url: `/api/v1/appointments/${ID}/confirm`, authorization: "Bearer manager-token", body: { staffIds: [STAFF], confirmOutOfShift: true } },
  ]);
});

test("rejectAppointment: POST /appointments/{id}/reject không có body; mã lịch được mã hóa trong đường dẫn", async () => {
  requests.length = 0;
  await rejectAppointment(ID);
  assert.deepEqual(requests, [{ method: "POST", url: `/api/v1/appointments/${ID}/reject`, authorization: "Bearer manager-token", body: null }]);
  await assert.rejects(rejectAppointment("a/b"), ApiError);
  assert.equal(requests[1].url, "/api/v1/appointments/a%2Fb/reject");
});
