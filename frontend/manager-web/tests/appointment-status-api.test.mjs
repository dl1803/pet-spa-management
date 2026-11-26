import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { completeAppointment, startAppointment } from "../lib/api/endpoints/appointments.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01";
const STALE_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e02";
const NO_PHOTO_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e03";

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
  incoming.on("data", (chunk) => {
    body += chunk;
  });
  incoming.on("end", () => {
    const { method, url } = incoming;
    requests.push({ method, url, authorization: incoming.headers.authorization ?? null, body: body ? JSON.parse(body) : null });
    response.setHeader("Content-Type", "application/json");
    if (method === "POST" && url === `/api/v1/appointments/${ID}/start`) {
      response.end(JSON.stringify({ status: "InProgress" }));
    } else if (method === "POST" && url === `/api/v1/appointments/${ID}/complete`) {
      response.end(JSON.stringify({ status: "Completed" }));
    } else if (method === "POST" && url === `/api/v1/appointments/${NO_PHOTO_ID}/start`) {
      problem(response, 409, "PHOTO_REQUIRED", "Cần có ảnh trước chăm sóc.");
    } else if (method === "POST" && url === `/api/v1/appointments/${STALE_ID}/complete`) {
      problem(response, 409, "INVALID_TRANSITION", "Lịch không ở trạng thái Đang thực hiện.");
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

test("startAppointment: POST /appointments/{id}/start không body, kèm Bearer, trả { status: InProgress }", async () => {
  requests.length = 0;
  const result = await startAppointment(ID);
  assert.deepEqual(result, { status: "InProgress" });
  assert.deepEqual(requests, [
    { method: "POST", url: `/api/v1/appointments/${ID}/start`, authorization: "Bearer manager-token", body: null },
  ]);
});

test("completeAppointment: POST /appointments/{id}/complete không body, trả { status: Completed }", async () => {
  requests.length = 0;
  const result = await completeAppointment(ID);
  assert.deepEqual(result, { status: "Completed" });
  assert.deepEqual(requests, [
    { method: "POST", url: `/api/v1/appointments/${ID}/complete`, authorization: "Bearer manager-token", body: null },
  ]);
});

test("start/complete: lỗi 409 được ném thành ApiError kèm code", async () => {
  await assert.rejects(startAppointment(NO_PHOTO_ID), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "PHOTO_REQUIRED");
    return true;
  });
  await assert.rejects(completeAppointment(STALE_ID), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "INVALID_TRANSITION");
    return true;
  });
});
