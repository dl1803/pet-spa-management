import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError, getErrorMessage } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { createService, listServices, setServiceStatus, updateService } from "../lib/api/endpoints/services.ts";
import { serviceKeys } from "../lib/queries/services.ts";

const SERVICE_ID = "d0000000-0000-4000-8000-000000000001";
const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

const request = {
  name: "Cắt tỉa lông",
  latestStartTime: "18:00",
  pricing: [{ species: "Dog", sizeGroup: "Small", price: 120000, durationMinutes: 60, staffRequired: 1 }],
};

const server = createServer((incoming, response) => {
  let body = "";
  incoming.on("data", (chunk) => { body += chunk; });
  incoming.on("end", () => {
    const { method, url } = incoming;
    requests.push({ method, url, authorization: incoming.headers.authorization ?? null, body: body ? JSON.parse(body) : null });
    response.setHeader("Content-Type", "application/json");
    if (method === "GET" && url === "/api/v1/services") {
      response.end(JSON.stringify([{ serviceId: SERVICE_ID, name: "Cắt tỉa lông", description: null, latestStartTime: "18:00", isActive: false, pricing: request.pricing }]));
    } else if (method === "POST" && url === "/api/v1/services" && JSON.parse(body).latestStartTime === "18:00") {
      response.statusCode = 201;
      response.end(JSON.stringify({ serviceId: SERVICE_ID }));
    } else if (method === "PUT" && url === `/api/v1/services/${SERVICE_ID}`) {
      response.end();
    } else if (method === "PATCH" && url === `/api/v1/services/${SERVICE_ID}/status`) {
      response.statusCode = 204;
      response.end();
    } else if (url === "/api/v1/services/missing") {
      response.statusCode = 404;
      response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify({ status: 404, code: "NOT_FOUND", title: "Không tìm thấy", detail: "Không tìm thấy dữ liệu được yêu cầu." }));
    } else {
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify({ status: 400, code: "VALIDATION_ERROR", title: "Dữ liệu không hợp lệ", detail: "Mốc giờ bắt đầu muộn nhất phải thuộc danh sách mốc giờ đặt lịch." }));
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

test("khóa query dịch vụ: danh sách nằm dưới khóa gốc để mutation làm mới được", () => {
  assert.deepEqual(serviceKeys.all, ["services"]);
  assert.deepEqual(serviceKeys.list(), ["services", "list"]);
  assert.deepEqual(serviceKeys.list().slice(0, serviceKeys.all.length), [...serviceKeys.all]);
});

test("listServices: GET /services kèm Bearer, trả cả dịch vụ đã ngừng", async () => {
  requests.length = 0;
  const services = await listServices();
  assert.deepEqual(requests, [{ method: "GET", url: "/api/v1/services", authorization: "Bearer manager-token", body: null }]);
  assert.equal(services.length, 1);
  assert.equal(services[0].isActive, false);
});

test("createService: POST /services gửi đúng body và trả serviceId", async () => {
  requests.length = 0;
  const created = await createService(request);
  assert.deepEqual(created, { serviceId: SERVICE_ID });
  assert.deepEqual(requests, [{ method: "POST", url: "/api/v1/services", authorization: "Bearer manager-token", body: request }]);
});

test("updateService: PUT /services/{id} gửi đúng body, chấp nhận 200 không nội dung", async () => {
  requests.length = 0;
  await updateService(SERVICE_ID, request);
  assert.deepEqual(requests, [{ method: "PUT", url: `/api/v1/services/${SERVICE_ID}`, authorization: "Bearer manager-token", body: request }]);
});

test("setServiceStatus: PATCH /services/{id}/status chỉ gửi isActive, chấp nhận 204", async () => {
  requests.length = 0;
  await setServiceStatus(SERVICE_ID, false);
  await setServiceStatus(SERVICE_ID, true);
  assert.deepEqual(requests.map((item) => [item.method, item.url, item.body]), [
    ["PATCH", `/api/v1/services/${SERVICE_ID}/status`, { isActive: false }],
    ["PATCH", `/api/v1/services/${SERVICE_ID}/status`, { isActive: true }],
  ]);
});

test("mã dịch vụ được mã hóa trong đường dẫn", async () => {
  requests.length = 0;
  await assert.rejects(updateService("a/b", request), ApiError);
  assert.equal(requests[0].url, "/api/v1/services/a%2Fb");
});

test("lỗi 404 và 400 giữ mã lỗi và câu của backend", async () => {
  await assert.rejects(updateService("missing", request), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });
  await assert.rejects(createService({ ...request, latestStartTime: "08:00" }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.equal(getErrorMessage(error), "Mốc giờ bắt đầu muộn nhất phải thuộc danh sách mốc giờ đặt lịch.");
    return true;
  });
});
