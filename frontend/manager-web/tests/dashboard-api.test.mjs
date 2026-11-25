import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { listAppointments } from "../lib/api/endpoints/appointments.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";

const SAMPLE_PAGE = {
  page: 1,
  pageSize: 100,
  total: 1,
  items: [
    {
      appointmentId: "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e11",
      type: "Spa",
      customerId: "cust-01",
      petId: "pet-01",
      petName: "Bông",
      status: "Confirmed",
      sizeGroup: "Small",
      slotStart: "2026-11-27T09:00:00+07:00",
      slotEnd: "2026-11-27T10:00:00+07:00",
      createdAt: "2026-11-25T10:00:00+07:00",
      updatedAt: "2026-11-25T10:00:00+07:00",
    },
  ],
};

const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

const server = createServer((incoming, response) => {
  const { method, url } = incoming;
  requests.push({ method, url, authorization: incoming.headers.authorization ?? null });
  response.setHeader("Content-Type", "application/json");
  if (method === "GET" && url === "/api/v1/appointments?type=Spa&date=2026-11-27&page=1&pageSize=100") {
    response.end(JSON.stringify(SAMPLE_PAGE));
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

test("listAppointments: truyền type, date, page, pageSize kèm Bearer và trả AppointmentPage", async () => {
  requests.length = 0;
  const page = await listAppointments({ type: "Spa", date: "2026-11-27", page: 1, pageSize: 100 });
  assert.deepEqual(requests, [
    {
      method: "GET",
      url: "/api/v1/appointments?type=Spa&date=2026-11-27&page=1&pageSize=100",
      authorization: "Bearer manager-token",
    },
  ]);
  assert.deepEqual(page, SAMPLE_PAGE);
});

test("khóa query dashboard nằm dưới khóa gốc appointments", () => {
  assert.deepEqual(appointmentKeys.dashboardSpaToday, ["appointments", "dashboard", "spa-today"]);
  assert.deepEqual(appointmentKeys.dashboardPendingCount("Hotel"), ["appointments", "dashboard", "pending-count", "Hotel"]);
});
