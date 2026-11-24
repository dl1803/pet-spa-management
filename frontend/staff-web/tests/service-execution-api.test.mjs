import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { apiClient } from "../lib/api/client.ts";
import { ApiError } from "../lib/api/errors.ts";
import {
  completeAppointment,
  listPhotos,
  markServiceDone,
  startAppointment,
  uploadPhoto,
} from "../lib/api/endpoints/appointments.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";

const APPOINTMENT_ID = "1031a003-0000-4000-8000-000000000003";
const SERVICE_ID = "d0000000-0000-4000-8000-000000000001";

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

test("startAppointment gửi POST /start không body và trả trạng thái mới", async () => {
  reply(200, { status: "InProgress" });
  const result = await startAppointment(APPOINTMENT_ID);
  assert.deepEqual(result, { status: "InProgress" });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].pathname, `/api/v1/appointments/${APPOINTMENT_ID}/start`);
  assert.equal(requests[0].body.length, 0);
});

test("completeAppointment gửi POST /complete không body và trả trạng thái mới", async () => {
  reply(200, { status: "Completed" });
  const result = await completeAppointment(APPOINTMENT_ID);
  assert.deepEqual(result, { status: "Completed" });
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].pathname, `/api/v1/appointments/${APPOINTMENT_ID}/complete`);
  assert.equal(requests[0].body.length, 0);
});

test("markServiceDone gửi PATCH { isDone: true, note } đã cắt khoảng trắng; 200 không có body", async () => {
  reply(200);
  const result = await markServiceDone({ appointmentId: APPOINTMENT_ID, serviceId: SERVICE_ID, note: "  Da hơi khô  " });
  assert.equal(result, undefined);
  assert.equal(requests[0].method, "PATCH");
  assert.equal(requests[0].pathname, `/api/v1/appointments/${APPOINTMENT_ID}/services/${SERVICE_ID}`);
  assert.match(requests[0].contentType, /^application\/json/);
  assert.deepEqual(jsonBody(requests[0]), { isDone: true, note: "Da hơi khô" });
});

test("markServiceDone bỏ note khi thiếu, rỗng hoặc chỉ có khoảng trắng", async () => {
  for (const note of [undefined, "", "   \n "]) {
    reply(200);
    await markServiceDone({ appointmentId: APPOINTMENT_ID, serviceId: SERVICE_ID, note });
    assert.deepEqual(jsonBody(requests[0]), { isDone: true });
  }
});

test("listPhotos gửi GET /photos và trả đúng mảng", async () => {
  const photos = [{ photoId: "p1", kind: "Before", url: "https://storage.example/p1.jpg", uploadedAt: "2026-11-25T02:00:00Z" }];
  reply(200, photos);
  assert.deepEqual(await listPhotos(APPOINTMENT_ID), photos);
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].pathname, `/api/v1/appointments/${APPOINTMENT_ID}/photos`);
});

test("uploadPhoto gửi multipart/form-data có kind và tệp ảnh, không bị đổi thành JSON", async () => {
  reply(201, { photoId: "11111111-1111-4111-8111-111111111111" });
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x01, 0x02])], "photo.jpg", { type: "image/jpeg" });
  const result = await uploadPhoto({ appointmentId: APPOINTMENT_ID, kind: "Before", file });
  assert.deepEqual(result, { photoId: "11111111-1111-4111-8111-111111111111" });

  const [request] = requests;
  assert.equal(request.method, "POST");
  assert.equal(request.pathname, `/api/v1/appointments/${APPOINTMENT_ID}/photos`);
  assert.match(request.contentType, /^multipart\/form-data; boundary=/);
  const text = request.body.toString("latin1");
  assert.match(text, /Content-Disposition: form-data; name="kind"\r\n\r\nBefore\r\n/);
  assert.match(text, /Content-Disposition: form-data; name="file"; filename="photo\.jpg"\r\nContent-Type: image\/jpeg\r\n\r\n/);
  assert.ok(request.body.includes(Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02])), "thân yêu cầu phải chứa đúng byte của tệp ảnh");
});

test("uploadPhoto báo tiến trình 0–100 và kết thúc ở 100", async () => {
  reply(201, { photoId: "p2" });
  const percents = [];
  const file = new File([new Uint8Array(2048)], "photo.jpg", { type: "image/jpeg" });
  await uploadPhoto({ appointmentId: APPOINTMENT_ID, kind: "After", file, onProgress: (percent) => percents.push(percent) });
  assert.ok(percents.length > 0);
  assert.ok(percents.every((percent) => Number.isInteger(percent) && percent >= 0 && percent <= 100));
  assert.equal(percents.at(-1), 100);
});

test("mã lịch và mã dịch vụ được mã hóa trong đường dẫn", async () => {
  reply(200, { status: "InProgress" });
  await startAppointment("a/b c");
  assert.equal(requests[0].pathname, "/api/v1/appointments/a%2Fb%20c/start");
});

test("lỗi 409 của /start, /complete, /photos trả ApiError mang đúng mã nghiệp vụ", async () => {
  const cases = [
    { call: () => startAppointment(APPOINTMENT_ID), code: "PHOTO_REQUIRED" },
    { call: () => startAppointment(APPOINTMENT_ID), code: "COST_CONFIRMATION_PENDING" },
    { call: () => completeAppointment(APPOINTMENT_ID), code: "SERVICES_INCOMPLETE" },
    { call: () => markServiceDone({ appointmentId: APPOINTMENT_ID, serviceId: SERVICE_ID }), code: "INVALID_TRANSITION" },
    {
      call: () => uploadPhoto({ appointmentId: APPOINTMENT_ID, kind: "After", file: new File([new Uint8Array(4)], "photo.jpg", { type: "image/jpeg" }) }),
      code: "INVALID_TRANSITION",
    },
  ];
  for (const { call, code } of cases) {
    reply(409, { status: 409, code, title: "Lỗi", detail: "Chi tiết" });
    await assert.rejects(call, (error) => error instanceof ApiError && error.status === 409 && error.code === code);
  }
});

test("lỗi 400 của /photos trả ApiError VALIDATION_ERROR kèm câu chi tiết của backend", async () => {
  reply(400, { status: 400, code: "VALIDATION_ERROR", title: "Dữ liệu không hợp lệ", detail: "Chỉ nhận tệp ảnh JPEG, PNG hoặc WebP." });
  await assert.rejects(
    () => uploadPhoto({ appointmentId: APPOINTMENT_ID, kind: "Before", file: new File([new Uint8Array(4)], "photo.jpg", { type: "image/jpeg" }) }),
    (error) => error instanceof ApiError && error.status === 400 && error.code === "VALIDATION_ERROR" && error.detail === "Chỉ nhận tệp ảnh JPEG, PNG hoặc WebP.",
  );
});

test("khóa truy vấn ảnh nằm dưới khóa chi tiết lịch (làm mới chi tiết cũng làm mới ảnh)", () => {
  assert.deepEqual(appointmentKeys.photos(APPOINTMENT_ID), ["appointments", "detail", APPOINTMENT_ID, "photos"]);
  assert.deepEqual(appointmentKeys.photos(APPOINTMENT_ID).slice(0, 3), [...appointmentKeys.detail(APPOINTMENT_ID)]);
});
