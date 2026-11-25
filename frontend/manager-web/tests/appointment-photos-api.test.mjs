import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { listPhotos } from "../lib/api/endpoints/appointments.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e99";
const MISSING_ID = "00000000-0000-4000-8000-000000000000";
const SAMPLE_PHOTOS = [
  {
    photoId: "p1",
    kind: "Before",
    url: "https://example.test/before.jpg",
    uploadedAt: "2026-11-27T09:10:00+07:00",
  },
];

const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

const server = createServer((incoming, response) => {
  const { method, url } = incoming;
  requests.push({ method, url, authorization: incoming.headers.authorization ?? null });
  response.setHeader("Content-Type", "application/json");
  if (method === "GET" && url === `/api/v1/appointments/${ID}/photos`) {
    response.end(JSON.stringify(SAMPLE_PHOTOS));
  } else {
    response.statusCode = 404;
    response.setHeader("Content-Type", "application/problem+json");
    response.end(JSON.stringify({ status: 404, code: "NOT_FOUND", title: "Không tìm thấy", detail: "Không tìm thấy dữ liệu được yêu cầu." }));
  }
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

test("appointmentKeys.photos: nằm dưới khóa chi tiết lịch hẹn", () => {
  assert.deepEqual(appointmentKeys.photos(ID), ["appointments", "detail", ID, "photos"]);
});

test("listPhotos: GET /appointments/{id}/photos kèm Bearer và trả đúng mảng ảnh", async () => {
  requests.length = 0;
  const photos = await listPhotos(ID);
  assert.deepEqual(requests, [
    { method: "GET", url: `/api/v1/appointments/${ID}/photos`, authorization: "Bearer manager-token" },
  ]);
  assert.deepEqual(photos, SAMPLE_PHOTOS);
});

test("listPhotos: lỗi 404 giữ mã lỗi NOT_FOUND của backend", async () => {
  await assert.rejects(listPhotos(MISSING_ID), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });
});
