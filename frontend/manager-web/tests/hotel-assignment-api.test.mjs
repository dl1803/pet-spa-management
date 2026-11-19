import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { confirmAppointment, getHotelSuggestions, rejectAppointment } from "../lib/api/endpoints/appointments.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03";
const NO_CAGE_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e04";
const CONFLICT_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e05";
const CAGE = "c0000000-0000-4000-8000-000000000003";
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
      response.end(JSON.stringify({ cage: { cageId: CAGE, code: "B3", species: "Cat", sizeGroup: "Medium", isActive: true } }));
    } else if (method === "GET" && url === `/api/v1/appointments/${NO_CAGE_ID}/suggestions`) {
      response.end(JSON.stringify({ cage: null }));
    } else if (method === "POST" && url === `/api/v1/appointments/${ID}/confirm`) {
      response.end(JSON.stringify({ status: "Confirmed" }));
    } else if (method === "POST" && url === `/api/v1/appointments/${CONFLICT_ID}/confirm`) {
      problem(response, 409, "CAGE_CONFLICT", "Chuồng đã được gán cho lịch khác hoặc không phù hợp với thú cưng.");
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

test("getHotelSuggestions: GET /appointments/{id}/suggestions kèm Bearer, trả chuồng đề xuất", async () => {
  requests.length = 0;
  const data = await getHotelSuggestions(ID);
  assert.deepEqual(requests, [{ method: "GET", url: `/api/v1/appointments/${ID}/suggestions`, authorization: "Bearer manager-token", body: null }]);
  assert.equal(data.cage.cageId, CAGE);
  assert.equal(data.cage.code, "B3");
});

test("getHotelSuggestions: không còn chuồng phù hợp thì cage = null", async () => {
  const data = await getHotelSuggestions(NO_CAGE_ID);
  assert.deepEqual(data, { cage: null });
});

test("confirmAppointment lưu trú: gửi đúng { cageId }, không thêm trường nào khác", async () => {
  requests.length = 0;
  await confirmAppointment(ID, { cageId: CAGE });
  assert.deepEqual(requests, [
    { method: "POST", url: `/api/v1/appointments/${ID}/confirm`, authorization: "Bearer manager-token", body: { cageId: CAGE } },
  ]);
});

test("confirmAppointment lưu trú: 409 CAGE_CONFLICT trở thành ApiError giữ mã lỗi", async () => {
  await assert.rejects(confirmAppointment(CONFLICT_ID, { cageId: CAGE }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "CAGE_CONFLICT");
    return true;
  });
});

test("rejectAppointment lưu trú: POST /appointments/{id}/reject không có body", async () => {
  requests.length = 0;
  await rejectAppointment(ID);
  assert.deepEqual(requests, [{ method: "POST", url: `/api/v1/appointments/${ID}/reject`, authorization: "Bearer manager-token", body: null }]);
});
