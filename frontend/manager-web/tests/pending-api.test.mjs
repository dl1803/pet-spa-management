import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { listAppointments } from "../lib/api/endpoints/appointments.ts";
import { getPet } from "../lib/api/endpoints/pets.ts";
import { appointmentKeys, PENDING_PAGE_SIZE } from "../lib/queries/appointments.ts";
import { petKeys } from "../lib/queries/pets.ts";

const PET_ID = "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f11";
const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

const server = createServer((incoming, response) => {
  const { method, url } = incoming;
  requests.push({ method, url, authorization: incoming.headers.authorization ?? null });
  response.setHeader("Content-Type", "application/json");
  if (method === "GET" && url === "/api/v1/appointments?status=Pending&page=1&pageSize=50") {
    response.end(JSON.stringify({ items: [{ appointmentId: "a1", type: "Spa", status: "Pending" }], page: 1, pageSize: 50, total: 1 }));
  } else if (method === "GET" && url === `/api/v1/pets/${PET_ID}`) {
    response.end(JSON.stringify({ petId: PET_ID, name: "Mochi", species: "Cat", isActive: true }));
  } else if (url === "/api/v1/appointments?status=Pending&page=1&pageSize=1") {
    response.statusCode = 403;
    response.setHeader("Content-Type", "application/problem+json");
    response.end(JSON.stringify({ status: 403, code: "FORBIDDEN", title: "Không có quyền", detail: "Bạn không có quyền thực hiện thao tác này." }));
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

test("khóa query: lịch hẹn và thú cưng nằm dưới khóa gốc để làm mới được", () => {
  assert.deepEqual(appointmentKeys.all, ["appointments"]);
  assert.deepEqual(appointmentKeys.list({ status: "Pending", page: 1, pageSize: 50 }).slice(0, 1), ["appointments"]);
  assert.deepEqual(petKeys.all, ["pets"]);
  assert.deepEqual(petKeys.detail(PET_ID), ["pets", "detail", PET_ID]);
  assert.equal(PENDING_PAGE_SIZE, 50);
});

test("listAppointments: GET /appointments?status=Pending&page=1&pageSize=50 kèm Bearer", async () => {
  requests.length = 0;
  const page = await listAppointments({ status: "Pending", page: 1, pageSize: PENDING_PAGE_SIZE });
  assert.deepEqual(requests, [
    { method: "GET", url: "/api/v1/appointments?status=Pending&page=1&pageSize=50", authorization: "Bearer manager-token" },
  ]);
  assert.equal(page.total, 1);
  assert.equal(page.items[0].appointmentId, "a1");
});

test("listAppointments: tham số không truyền thì không có trên URL", async () => {
  requests.length = 0;
  await assert.rejects(listAppointments({ type: "Hotel" }), ApiError);
  assert.equal(requests[0].url, "/api/v1/appointments?type=Hotel");
});

test("getPet: GET /pets/{id} kèm Bearer và mã thú cưng được mã hóa trong đường dẫn", async () => {
  requests.length = 0;
  const pet = await getPet(PET_ID);
  assert.deepEqual(requests, [{ method: "GET", url: `/api/v1/pets/${PET_ID}`, authorization: "Bearer manager-token" }]);
  assert.equal(pet.name, "Mochi");
  await assert.rejects(getPet("a/b"), ApiError);
  assert.equal(requests[1].url, "/api/v1/pets/a%2Fb");
});

test("lỗi 403 và 404 giữ mã lỗi của backend", async () => {
  await assert.rejects(listAppointments({ status: "Pending", page: 1, pageSize: 1 }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.code, "FORBIDDEN");
    return true;
  });
  await assert.rejects(getPet("missing"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });
});
