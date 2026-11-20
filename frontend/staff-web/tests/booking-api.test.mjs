import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { apiClient } from "../lib/api/client.ts";
import { ApiError } from "../lib/api/errors.ts";
import { createHotelAppointment, createSpaAppointment, getSpaSlots } from "../lib/api/endpoints/appointments.ts";
import { getHotelAvailability, getHotelPricing } from "../lib/api/endpoints/hotel.ts";
import { listServices } from "../lib/api/endpoints/services.ts";
import { hotelKeys } from "../lib/queries/hotel.ts";
import { serviceKeys } from "../lib/queries/services.ts";
import { spaSlotKeys } from "../lib/queries/spa-slots.ts";

const requests = [];
let nextResponse = { status: 200, body: {} };
let originalBaseURL;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

const server = createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const url = new URL(request.url, "http://localhost");
    const raw = Buffer.concat(chunks).toString("utf8");
    requests.push({
      method: request.method,
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body: raw === "" ? null : JSON.parse(raw),
    });
    response.statusCode = nextResponse.status;
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

function reply(status, body) {
  requests.length = 0;
  nextResponse = { status, body };
}

const SERVICE = {
  serviceId: "s1",
  name: "Tắm & sấy lông",
  description: null,
  latestStartTime: "18:00",
  isActive: true,
  pricing: [{ species: "Dog", sizeGroup: "Medium", price: 180000, durationMinutes: 75, staffRequired: 1 }],
};

test("listServices: GET /services gửi species và sizeGroup, trả mảng dịch vụ", async () => {
  reply(200, [SERVICE]);
  const result = await listServices({ species: "Dog", sizeGroup: "Medium" });
  assert.deepEqual(result, [SERVICE]);
  assert.deepEqual(requests, [
    { method: "GET", pathname: "/api/v1/services", query: { species: "Dog", sizeGroup: "Medium" }, body: null },
  ]);
});

test("listServices: không truyền tham số thì không gửi query", async () => {
  reply(200, []);
  await listServices();
  assert.deepEqual(requests[0].query, {});
});

test("getSpaSlots: GET /spa/slots gửi date, petId và serviceIds dạng một chuỗi cách nhau bằng dấu phẩy", async () => {
  const slots = {
    durationMinutes: 150,
    staffRequired: 2,
    bufferMinutes: 15,
    slots: [{ time: "09:00", group: "Sáng", status: "Available" }],
  };
  reply(200, slots);
  const result = await getSpaSlots({ date: "2026-10-08", petId: "p1", serviceIds: ["s1", "s2"] });
  assert.deepEqual(result, slots);
  assert.deepEqual(requests, [
    {
      method: "GET",
      pathname: "/api/v1/spa/slots",
      query: { date: "2026-10-08", petId: "p1", serviceIds: "s1,s2" },
      body: null,
    },
  ]);
});

test("createSpaAppointment: POST /appointments/spa gửi nguyên request kèm customerId", async () => {
  const created = { appointmentId: "a1", status: "Pending", slotEnd: "2026-10-08T16:15:00+07:00", staffRequired: 2, estimatedAmount: 180000 };
  reply(201, created);
  const request = {
    petId: "p1",
    serviceIds: ["s1"],
    slotStart: "2026-10-08T15:00:00+07:00",
    customerId: "c1",
  };
  assert.deepEqual(await createSpaAppointment(request), created);
  assert.deepEqual(requests, [{ method: "POST", pathname: "/api/v1/appointments/spa", query: {}, body: request }]);
});

test("createSpaAppointment: 409 SLOT_FULL trả ApiError mang đúng status và code", async () => {
  reply(409, { status: 409, code: "SLOT_FULL", title: "Mốc giờ đã kín" });
  await assert.rejects(
    () => createSpaAppointment({ petId: "p1", serviceIds: ["s1"], slotStart: "2026-10-08T15:00:00+07:00", customerId: "c1" }),
    (error) => error instanceof ApiError && error.status === 409 && error.code === "SLOT_FULL",
  );
});

test("getHotelAvailability: GET /hotel/availability gửi petId, from, to; độ lệch +07:00 được mã hóa đúng", async () => {
  const availability = { available: true, nights: 2, estimatedAmount: 540000 };
  reply(200, availability);
  const result = await getHotelAvailability({
    petId: "p1",
    from: "2026-10-08T09:00:00+07:00",
    to: "2026-10-10T18:00:00+07:00",
  });
  assert.deepEqual(result, availability);
  assert.deepEqual(requests, [
    {
      method: "GET",
      pathname: "/api/v1/hotel/availability",
      query: { petId: "p1", from: "2026-10-08T09:00:00+07:00", to: "2026-10-10T18:00:00+07:00" },
      body: null,
    },
  ]);
});

test("getHotelPricing: GET /hotel/pricing trả bảng giá và phí trả muộn", async () => {
  const pricing = {
    pricing: [{ species: "Dog", sizeGroup: "Medium", pricePerNight: 220000, foodPerNight: 50000 }],
    lateFeePerBlock: 0,
  };
  reply(200, pricing);
  assert.deepEqual(await getHotelPricing(), pricing);
  assert.deepEqual(requests, [{ method: "GET", pathname: "/api/v1/hotel/pricing", query: {}, body: null }]);
});

test("createHotelAppointment: POST /appointments/hotel gửi nguyên request kèm customerId", async () => {
  const created = { appointmentId: "a2", status: "Pending", nights: 2, estimatedAmount: 540000 };
  reply(201, created);
  const request = {
    petId: "p1",
    plannedCheckIn: "2026-10-08T09:00:00+07:00",
    plannedCheckOut: "2026-10-10T18:00:00+07:00",
    customerId: "c1",
  };
  assert.deepEqual(await createHotelAppointment(request), created);
  assert.deepEqual(requests, [{ method: "POST", pathname: "/api/v1/appointments/hotel", query: {}, body: request }]);
});

test("createHotelAppointment: 409 NO_CAPACITY trả ApiError mang đúng status và code", async () => {
  reply(409, { status: 409, code: "NO_CAPACITY", title: "Hết chỗ" });
  await assert.rejects(
    () =>
      createHotelAppointment({
        petId: "p1",
        plannedCheckIn: "2026-10-08T09:00:00+07:00",
        plannedCheckOut: "2026-10-10T18:00:00+07:00",
        customerId: "c1",
      }),
    (error) => error instanceof ApiError && error.status === 409 && error.code === "NO_CAPACITY",
  );
});

test("khóa truy vấn: ổn định theo tham số và có gốc chung để làm mới", () => {
  assert.deepEqual(serviceKeys.list({ species: "Dog", sizeGroup: "Medium" }), [
    "services",
    "list",
    { species: "Dog", sizeGroup: "Medium" },
  ]);
  const slotParams = { date: "2026-10-08", petId: "p1", serviceIds: ["s1"] };
  assert.deepEqual(spaSlotKeys.list(slotParams), ["spa-slots", slotParams]);
  assert.deepEqual(spaSlotKeys.list(null), ["spa-slots", null]);
  assert.deepEqual(spaSlotKeys.all, ["spa-slots"]);
  const stay = { petId: "p1", from: "2026-10-08T09:00:00+07:00", to: "2026-10-10T18:00:00+07:00" };
  assert.deepEqual(hotelKeys.availability(stay), ["hotel", "availability", stay]);
  assert.deepEqual(hotelKeys.availabilityAll, ["hotel", "availability"]);
  assert.deepEqual(hotelKeys.pricing, ["hotel", "pricing"]);
});
