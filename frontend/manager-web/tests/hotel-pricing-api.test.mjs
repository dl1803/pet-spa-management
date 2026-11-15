import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError, getErrorMessage, isForbiddenError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { getHotelPricing, updateHotelPricing } from "../lib/api/endpoints/hotel-pricing.ts";
import { hotelPricingKeys } from "../lib/queries/hotel-pricing.ts";

const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

const pricing = {
  pricing: [
    { species: "Dog", sizeGroup: "Small", pricePerNight: 180000, foodPerNight: 40000 },
    { species: "GuineaPig", sizeGroup: "Large", pricePerNight: 100000, foodPerNight: 25000 },
  ],
  lateFeePerBlock: 50000,
};

// Giả lập backend: ứng xử theo token để kiểm tra cả lỗi 403 và 400 mà không cần backend thật.
const server = createServer((incoming, response) => {
  let body = "";
  incoming.on("data", (chunk) => { body += chunk; });
  incoming.on("end", () => {
    const { method, url } = incoming;
    const authorization = incoming.headers.authorization ?? null;
    requests.push({ method, url, authorization, body: body ? JSON.parse(body) : null });
    response.setHeader("Content-Type", "application/json");
    if (url !== "/api/v1/hotel/pricing") {
      response.statusCode = 404;
      response.end();
    } else if (authorization === "Bearer customer-token" && method === "PUT") {
      response.statusCode = 403;
      response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify({ status: 403, code: "FORBIDDEN", title: "Không có quyền truy cập", detail: "Bạn không có quyền thực hiện thao tác này." }));
    } else if (method === "GET") {
      // Chưa thiết lập giá: không có dòng nào, phí trả muộn bằng 0.
      response.end(JSON.stringify(authorization === "Bearer empty-token" ? { pricing: [], lateFeePerBlock: 0 } : pricing));
    } else if (method === "PUT" && JSON.parse(body).lateFeePerBlock < 0) {
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify({ status: 400, code: "VALIDATION_ERROR", title: "Dữ liệu không hợp lệ", detail: "Phí phạt trả muộn mỗi lần không được âm." }));
    } else if (method === "PUT") {
      response.end();
    } else {
      response.statusCode = 405;
      response.end();
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

test("khóa query giá lưu trú: một khóa gốc để mutation làm mới được", () => {
  assert.deepEqual(hotelPricingKeys.all, ["hotel-pricing"]);
});

test("getHotelPricing: GET /hotel/pricing kèm Bearer, trả nguyên pricing và lateFeePerBlock", async () => {
  requests.length = 0;
  const result = await getHotelPricing();
  assert.deepEqual(requests, [{ method: "GET", url: "/api/v1/hotel/pricing", authorization: "Bearer manager-token", body: null }]);
  assert.deepEqual(result, pricing);
});

test("getHotelPricing: chưa thiết lập giá thì backend trả pricing rỗng và phí 0, web không tự thêm dòng", async () => {
  setAccessTokenProvider(() => "empty-token");
  try {
    assert.deepEqual(await getHotelPricing(), { pricing: [], lateFeePerBlock: 0 });
  } finally {
    setAccessTokenProvider(() => "manager-token");
  }
});

test("updateHotelPricing: PUT /hotel/pricing gửi đúng body { pricing, lateFeePerBlock }, chấp nhận 200 không nội dung", async () => {
  requests.length = 0;
  await updateHotelPricing(pricing);
  assert.deepEqual(requests, [{ method: "PUT", url: "/api/v1/hotel/pricing", authorization: "Bearer manager-token", body: pricing }]);
  assert.deepEqual(Object.keys(requests[0].body).sort(), ["lateFeePerBlock", "pricing"]);
});

test("lỗi 400 giữ mã lỗi và câu của backend", async () => {
  await assert.rejects(updateHotelPricing({ ...pricing, lateFeePerBlock: -1 }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.equal(getErrorMessage(error), "Phí phạt trả muộn mỗi lần không được âm.");
    return true;
  });
});

test("lỗi 403 FORBIDDEN được nhận ra là không có quyền", async () => {
  setAccessTokenProvider(() => "customer-token");
  try {
    await assert.rejects(updateHotelPricing(pricing), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403);
      assert.ok(isForbiddenError(error));
      return true;
    });
  } finally {
    setAccessTokenProvider(() => "manager-token");
  }
});
