import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError, getErrorMessage } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { listPayments, payAtCounter } from "../lib/api/endpoints/payments.ts";
import { UNPAID_SUMMARY_PAGE_SIZE, paymentKeys } from "../lib/queries/payments.ts";

const PAYMENT_ID = "9e3b0001-2a6d-4b18-8c35-6d7e8f9a0b00";
const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

function problem(response, status, code, title, detail) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/problem+json");
  response.end(JSON.stringify({ status, code, title, detail }));
}

const server = createServer((incoming, response) => {
  let body = "";
  incoming.on("data", (chunk) => { body += chunk; });
  incoming.on("end", () => {
    const { method, url } = incoming;
    requests.push({ method, url, authorization: incoming.headers.authorization ?? null, body: body ? JSON.parse(body) : null });
    response.setHeader("Content-Type", "application/json");
    if (method === "GET" && url === "/api/v1/payments?status=Unpaid&page=1&pageSize=100") {
      response.end(JSON.stringify({
        page: 1,
        pageSize: 100,
        total: 1,
        items: [{ paymentId: PAYMENT_ID, appointmentId: "5f1c0402-7e44-4c0a-9d21-0a1b2c3d4e00", kind: "Stay", amount: 250000, status: "Unpaid", method: null, receivedAmount: null, paidAt: null }],
      }));
    } else if (method === "GET" && url === "/api/v1/payments?page=2&pageSize=20") {
      response.end(JSON.stringify({ page: 2, pageSize: 20, total: 21, items: [] }));
    } else if (method === "GET" && url === "/api/v1/payments?page=1&pageSize=20") {
      response.end(JSON.stringify({
        page: 1,
        pageSize: 20,
        total: 1,
        items: [{ paymentId: PAYMENT_ID, appointmentId: "5f1c0402-7e44-4c0a-9d21-0a1b2c3d4e00", kind: "Spa", amount: 150000, status: "Paid", method: "Online", receivedAmount: 150000, paidAt: "2026-10-05T09:42:00+00:00" }],
      }));
    } else if (method === "GET" && url.startsWith("/api/v1/payments")) {
      problem(response, 403, "FORBIDDEN", "Không có quyền", "Bạn không có quyền thực hiện thao tác này.");
    } else if (method === "POST" && url === `/api/v1/payments/${PAYMENT_ID}/counter` && JSON.parse(body).receivedAmount >= 250000) {
      response.end(JSON.stringify({ status: "Paid" }));
    } else if (method === "POST" && url === `/api/v1/payments/${PAYMENT_ID}/counter`) {
      problem(response, 409, "AMOUNT_MISMATCH", "Số tiền không khớp", "Số tiền nhận thấp hơn số tiền phải trả.");
    } else if (method === "POST" && url === "/api/v1/payments/not-due/counter") {
      problem(response, 409, "PAYMENT_NOT_DUE", "Chưa đến hạn", "Khoản thanh toán chưa đến thời điểm ghi nhận.");
    } else if (method === "POST" && url === "/api/v1/payments/pending-cost/counter") {
      problem(response, 409, "COST_CONFIRMATION_PENDING", "Chờ xác nhận chi phí", "Đang chờ khách xác nhận chi phí mới.");
    } else if (method === "POST" && url === "/api/v1/payments/missing/counter") {
      problem(response, 404, "NOT_FOUND", "Không tìm thấy", "Không tìm thấy dữ liệu được yêu cầu.");
    } else {
      problem(response, 400, "VALIDATION_ERROR", "Dữ liệu không hợp lệ", "method chỉ gồm Cash hoặc BankQR.");
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

test("khóa query thanh toán: danh sách nằm dưới khóa gốc; thẻ chưa thanh toán lấy tối đa 100 khoản", () => {
  assert.deepEqual(paymentKeys.all, ["payments"]);
  const key = paymentKeys.list({ status: "Unpaid", page: 1, pageSize: UNPAID_SUMMARY_PAGE_SIZE });
  assert.deepEqual(key, ["payments", "list", { status: "Unpaid", page: 1, pageSize: 100 }]);
  assert.deepEqual(key.slice(0, paymentKeys.all.length), [...paymentKeys.all]);
  assert.equal(UNPAID_SUMMARY_PAGE_SIZE, 100);
});

test("listPayments: GET /payments?status=Unpaid&page=1&pageSize=100 kèm Bearer, trả items và total", async () => {
  requests.length = 0;
  const page = await listPayments({ status: "Unpaid", page: 1, pageSize: UNPAID_SUMMARY_PAGE_SIZE });
  assert.deepEqual(requests, [{ method: "GET", url: "/api/v1/payments?status=Unpaid&page=1&pageSize=100", authorization: "Bearer manager-token", body: null }]);
  assert.equal(page.total, 1);
  assert.equal(page.items[0].status, "Unpaid");
  assert.equal(page.items[0].amount, 250000);
});

test("listPayments: không có status thì không gửi tham số status (xem Tất cả)", async () => {
  requests.length = 0;
  const page = await listPayments({ status: undefined, page: 1, pageSize: 20 });
  assert.deepEqual(requests.map((item) => item.url), ["/api/v1/payments?page=1&pageSize=20"]);
  assert.equal(page.items[0].method, "Online");
});

test("listPayments: trang vượt quá số trang trả items rỗng nhưng vẫn có total", async () => {
  const page = await listPayments({ page: 2, pageSize: 20 });
  assert.deepEqual(page.items, []);
  assert.equal(page.total, 21);
});

test("listPayments: 403 FORBIDDEN giữ mã lỗi để màn hiện ForbiddenState", async () => {
  await assert.rejects(listPayments({ status: "Paid", page: 1, pageSize: 20 }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.code, "FORBIDDEN");
    return true;
  });
});

test("payAtCounter: POST /payments/{id}/counter chỉ gửi method và receivedAmount, trả status Paid", async () => {
  requests.length = 0;
  const result = await payAtCounter(PAYMENT_ID, { method: "BankQR", receivedAmount: 300000 });
  assert.deepEqual(result, { status: "Paid" });
  assert.deepEqual(requests, [{
    method: "POST",
    url: `/api/v1/payments/${PAYMENT_ID}/counter`,
    authorization: "Bearer manager-token",
    body: { method: "BankQR", receivedAmount: 300000 },
  }]);
  assert.ok(!("amount" in requests[0].body));
});

test("payAtCounter: 409 AMOUNT_MISMATCH giữ mã lỗi để hộp thoại hiện dưới ô số tiền", async () => {
  await assert.rejects(payAtCounter(PAYMENT_ID, { method: "Cash", receivedAmount: 249999 }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "AMOUNT_MISMATCH");
    return true;
  });
});

test("payAtCounter: 409 PAYMENT_NOT_DUE và COST_CONFIRMATION_PENDING hiện câu của backend", async () => {
  await assert.rejects(payAtCounter("not-due", { method: "Cash", receivedAmount: 1 }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "PAYMENT_NOT_DUE");
    assert.equal(getErrorMessage(error), "Khoản thanh toán chưa đến thời điểm ghi nhận.");
    return true;
  });
  await assert.rejects(payAtCounter("pending-cost", { method: "Cash", receivedAmount: 1 }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "COST_CONFIRMATION_PENDING");
    assert.equal(getErrorMessage(error), "Đang chờ khách xác nhận chi phí mới.");
    return true;
  });
});

test("payAtCounter: 404 NOT_FOUND; mã khoản được mã hóa trong đường dẫn", async () => {
  requests.length = 0;
  await assert.rejects(payAtCounter("missing", { method: "Cash", receivedAmount: 1 }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });
  await assert.rejects(payAtCounter("a/b", { method: "Cash", receivedAmount: 1 }), ApiError);
  assert.deepEqual(requests.map((item) => item.url), ["/api/v1/payments/missing/counter", "/api/v1/payments/a%2Fb/counter"]);
});
