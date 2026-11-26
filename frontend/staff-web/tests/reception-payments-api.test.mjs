import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { buildDueListParams, buildPricedServices, findHotelRate, isCounterPaymentDue, loadCounterPayments } from "../features/reception-payments/load-payments.ts";
import { apiClient } from "../lib/api/client.ts";
import { listAppointmentPayments, payAtCounter } from "../lib/api/endpoints/payments.ts";

const SPA_ID = "a1000000-0000-4000-8000-000000000001";
const STAY_ID = "a2000000-0000-4000-8000-000000000002";
const INSTAY_ID = "a3000000-0000-4000-8000-000000000003";
const PAID_ID = "a4000000-0000-4000-8000-000000000004";
const PET_DOG = "b1000000-0000-4000-8000-000000000001";
const PET_CAT = "b2000000-0000-4000-8000-000000000002";

const appointment = (appointmentId, type, status, petId, extra = {}) => ({
  appointmentId,
  type,
  customerId: "c1",
  petId,
  customerName: "Nguyễn Văn A",
  petName: "Cốm",
  status,
  sizeGroup: "Small",
  createdAt: "2026-11-20T10:00:00+07:00",
  updatedAt: "2026-11-20T10:00:00+07:00",
  ...extra,
});
const payment = (paymentId, appointmentId, kind, status = "Unpaid", amount = 250000) => ({
  paymentId,
  appointmentId,
  kind,
  amount,
  status,
  method: null,
  receivedAmount: null,
  paidAt: null,
});

const requests = [];
let failHotelPricing = false;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
let originalBaseURL;

const lists = {
  "Spa|Completed": [appointment(SPA_ID, "Spa", "Completed", PET_DOG)],
  "Hotel|Confirmed": [appointment(STAY_ID, "Hotel", "Confirmed", PET_CAT, { plannedCheckIn: "2026-11-28T09:00:00+07:00", plannedCheckOut: "2026-11-30T12:00:00+07:00" })],
  "Hotel|InStay": [appointment(INSTAY_ID, "Hotel", "InStay", PET_CAT), appointment(PAID_ID, "Hotel", "InStay", PET_CAT)],
};
const payments = {
  [SPA_ID]: [payment("e1", SPA_ID, "Spa", "Unpaid", 180000)],
  [STAY_ID]: [payment("e2", STAY_ID, "Stay")],
  [INSTAY_ID]: [payment("e3", INSTAY_ID, "Stay", "Paid"), payment("e4", INSTAY_ID, "LateFee", "Unpaid", 100000)],
  [PAID_ID]: [payment("e5", PAID_ID, "Stay", "Paid")],
};

const server = createServer((incoming, response) => {
  let raw = "";
  incoming.on("data", (chunk) => {
    raw += chunk;
  });
  incoming.on("end", () => {
    const url = new URL(incoming.url, "http://localhost");
    const query = Object.fromEntries(url.searchParams);
    requests.push({ method: incoming.method, pathname: url.pathname, query, body: raw === "" ? null : JSON.parse(raw) });
    response.setHeader("Content-Type", "application/json");
    const send = (status, body) => {
      response.statusCode = status;
      if (status >= 400) response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify(body));
    };
    const { pathname } = url;
    let match;
    if (incoming.method === "GET" && pathname === "/api/v1/appointments") {
      const items = lists[`${query.type}|${query.status}`] ?? [];
      send(200, { items, page: 1, pageSize: 100, total: items.length });
    } else if (incoming.method === "GET" && (match = pathname.match(/^\/api\/v1\/appointments\/([^/]+)\/payments$/))) {
      send(200, payments[match[1]] ?? []);
    } else if (incoming.method === "GET" && (match = pathname.match(/^\/api\/v1\/appointments\/([^/]+)$/))) {
      const found = Object.values(lists).flat().find((item) => item.appointmentId === match[1]);
      send(200, { ...found, services: [{ serviceId: "s1", name: "Tắm", isDone: true }, { serviceId: "s2", name: "Cắt móng", isDone: true }] });
    } else if (incoming.method === "GET" && (match = pathname.match(/^\/api\/v1\/pets\/([^/]+)$/))) {
      send(200, { petId: match[1], customerId: "c1", name: "Cốm", species: match[1] === PET_DOG ? "Dog" : "Cat", breed: "x", temperament: "Calm", weightKg: 4, sizeGroup: "Small", isActive: true });
    } else if (incoming.method === "GET" && pathname === "/api/v1/hotel/pricing") {
      if (failHotelPricing) send(500, { status: 500, title: "Lỗi" });
      else send(200, { pricing: [{ species: "Cat", sizeGroup: "Small", pricePerNight: 120000, foodPerNight: 30000 }], lateFeePerBlock: 50000 });
    } else if (incoming.method === "GET" && pathname === "/api/v1/services") {
      send(200, [
        { serviceId: "s1", name: "Tắm", latestStartTime: "16:00", isActive: true, pricing: [{ species: "Dog", sizeGroup: "Small", price: 120000 }] },
        { serviceId: "s2", name: "Cắt móng", latestStartTime: "16:00", isActive: true, pricing: [{ species: "Dog", sizeGroup: "Small", price: 60000 }] },
      ]);
    } else if (incoming.method === "POST" && pathname === "/api/v1/payments/e1/counter") {
      send(200, { status: "Paid" });
    } else if (incoming.method === "POST" && pathname === "/api/v1/payments/e2/counter") {
      send(409, { status: 409, code: "AMOUNT_MISMATCH", title: "Xung đột", detail: "Số tiền nhận thấp hơn số tiền phải trả." });
    } else {
      send(404, { status: 404, code: "NOT_FOUND", title: "Không tìm thấy" });
    }
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

test("listAppointmentPayments: GET /appointments/{id}/payments, mã hóa ID", async () => {
  requests.length = 0;
  const result = await listAppointmentPayments(SPA_ID);
  assert.equal(result[0].paymentId, "e1");
  assert.deepEqual(requests, [{ method: "GET", pathname: `/api/v1/appointments/${SPA_ID}/payments`, query: {}, body: null }]);
  assert.deepEqual(await listAppointmentPayments("a/b"), []);
  assert.equal(requests[1].pathname, "/api/v1/appointments/a%2Fb/payments");
});

test("payAtCounter: POST /payments/{id}/counter chỉ gửi method và receivedAmount; lỗi 409 giữ nguyên code", async () => {
  requests.length = 0;
  const result = await payAtCounter("e1", { method: "Cash", receivedAmount: 200000 });
  assert.deepEqual(result, { status: "Paid" });
  assert.deepEqual(requests, [
    { method: "POST", pathname: "/api/v1/payments/e1/counter", query: {}, body: { method: "Cash", receivedAmount: 200000 } },
  ]);
  await assert.rejects(payAtCounter("e2", { method: "Cash", receivedAmount: 1 }), (error) => {
    assert.equal(error.status, 409);
    assert.equal(error.code, "AMOUNT_MISMATCH");
    return true;
  });
});

test("buildDueListParams: spa Hoàn tất và lưu trú Đã xác nhận lọc theo ngày, lưu trú Đang lưu trú không lọc ngày", () => {
  assert.deepEqual(buildDueListParams("2026-11-28"), [
    { type: "Spa", status: "Completed", date: "2026-11-28", pageSize: 100 },
    { type: "Hotel", status: "Confirmed", date: "2026-11-28", pageSize: 100 },
    { type: "Hotel", status: "InStay", pageSize: 100 },
  ]);
});

test("isCounterPaymentDue: chỉ khoản chưa thanh toán và đúng trạng thái lịch (BR-07)", () => {
  const spaDone = appointment(SPA_ID, "Spa", "Completed", PET_DOG);
  const stayConfirmed = appointment(STAY_ID, "Hotel", "Confirmed", PET_CAT);
  const inStay = appointment(INSTAY_ID, "Hotel", "InStay", PET_CAT);
  assert.equal(isCounterPaymentDue(payment("p", SPA_ID, "Spa"), spaDone), true);
  assert.equal(isCounterPaymentDue(payment("p", SPA_ID, "Spa", "Paid"), spaDone), false);
  assert.equal(isCounterPaymentDue(payment("p", STAY_ID, "Stay"), stayConfirmed), true);
  assert.equal(isCounterPaymentDue(payment("p", INSTAY_ID, "Stay"), inStay), false);
  assert.equal(isCounterPaymentDue(payment("p", INSTAY_ID, "LateFee"), inStay), true);
  assert.equal(isCounterPaymentDue(payment("p", STAY_ID, "LateFee"), stayConfirmed), false);
});

test("findHotelRate và buildPricedServices: thiếu dữ liệu thì bỏ phần giải thích", () => {
  const pricing = { pricing: [{ species: "Cat", sizeGroup: "Small", pricePerNight: 120000, foodPerNight: 30000 }], lateFeePerBlock: 50000 };
  assert.deepEqual(findHotelRate(pricing, "Cat", "Small"), { pricePerNight: 120000, foodPerNight: 30000 });
  assert.equal(findHotelRate(pricing, "Dog", "Small"), null);
  assert.equal(findHotelRate(null, "Cat", "Small"), null);
  const detail = { ...appointment(SPA_ID, "Spa", "Completed", PET_DOG), services: [{ serviceId: "s1", isDone: true }, { serviceId: "s9", isDone: true }] };
  const catalog = [{ serviceId: "s1", name: "Tắm", latestStartTime: "16:00", isActive: true, pricing: [{ species: "Dog", sizeGroup: "Small", price: 120000 }] }];
  assert.deepEqual(buildPricedServices(detail, "Dog", catalog), []);
  assert.deepEqual(buildPricedServices({ ...detail, services: [detail.services[0]] }, "Dog", catalog), [{ name: "Tắm", price: 120000 }]);
  assert.deepEqual(buildPricedServices(detail, "Dog", null), []);
});

test("loadCounterPayments: chỉ giữ khoản đến hạn, gắn loài, giá giải thích và người xác nhận", async () => {
  requests.length = 0;
  failHotelPricing = false;
  const data = await loadCounterPayments("Thu Hà");
  assert.equal(data.confirmerName, "Thu Hà");
  assert.deepEqual(data.rows.map((row) => row.payment.paymentId), ["e1", "e2", "e4"]);

  const [spa, stay, lateFee] = data.rows;
  assert.equal(spa.species, "Dog");
  assert.deepEqual(spa.services, [{ name: "Tắm", price: 120000 }, { name: "Cắt móng", price: 60000 }]);
  assert.equal(spa.completedAt, null);
  assert.equal(stay.species, "Cat");
  assert.deepEqual(stay.hotelRate, { pricePerNight: 120000, foodPerNight: 30000 });
  assert.equal(lateFee.hotelRate, null);
  assert.equal(lateFee.payment.amount, 100000);

  const listCalls = requests.filter((item) => item.pathname === "/api/v1/appointments");
  assert.equal(listCalls.length, 3);
  assert.ok(listCalls.every((item) => item.query.pageSize === "100"));
  assert.match(listCalls[0].query.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(listCalls[2].query.date, undefined);
  assert.equal(requests.filter((item) => item.method !== "GET").length, 0);
});

test("loadCounterPayments: lỗi tải giá giải thích không chặn danh sách khoản cần thu", async () => {
  failHotelPricing = true;
  const data = await loadCounterPayments("Thu Hà");
  failHotelPricing = false;
  assert.deepEqual(data.rows.map((row) => row.payment.paymentId), ["e1", "e2", "e4"]);
  assert.equal(data.rows[1].hotelRate, null);
});
