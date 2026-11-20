import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import {
  cancelAppointment,
  getAppointment,
  updateAppointment,
} from "../lib/api/endpoints/appointments.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";
import { buildStoreDateTime } from "../lib/time.ts";

const ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01";
const STALE_ID = "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e02";
const PET_ID = "pet-01";
const SERVICE_ID = "svc-01";
const STAFF_ID = "staff-01";

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
    requests.push({
      method,
      url,
      authorization: incoming.headers.authorization ?? null,
      body: body ? JSON.parse(body) : null,
    });
    response.setHeader("Content-Type", "application/json");

    if (method === "GET" && url === `/api/v1/appointments/${ID}`) {
      response.end(
        JSON.stringify({
          appointmentId: ID,
          type: "Spa",
          customerId: "cust-01",
          petId: PET_ID,
          status: "Pending",
          sizeGroup: "Medium",
          slotStart: "2026-11-23T09:00:00+07:00",
          slotEnd: "2026-11-23T10:00:00+07:00",
          createdAt: "2026-11-20T10:00:00+07:00",
          updatedAt: "2026-11-20T10:00:00+07:00",
        }),
      );
    } else if (method === "GET" && url === "/api/v1/appointments/a%2Fb") {
      problem(response, 404, "NOT_FOUND", "Không tìm thấy lịch hẹn.");
    } else if (method === "PUT" && url === `/api/v1/appointments/${ID}`) {
      const request = JSON.parse(body);
      if (request.confirmOutOfShift === true) {
        response.end(JSON.stringify({ status: "Confirmed" }));
      } else {
        problem(
          response,
          409,
          "STAFF_OUT_OF_SHIFT",
          "Nhân viên không có ca làm phủ khung giờ này.",
        );
      }
    } else if (method === "POST" && url === `/api/v1/appointments/${ID}/cancel`) {
      response.end(JSON.stringify({ status: "Cancelled" }));
    } else if (method === "POST" && url === `/api/v1/appointments/${STALE_ID}/cancel`) {
      problem(response, 409, "INVALID_TRANSITION", "Không thể hủy lịch ở trạng thái hiện tại.");
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

test("khóa query detail và suggestions có cấu trúc chuẩn", () => {
  assert.deepEqual(appointmentKeys.detail(ID), ["appointments", "detail", ID]);
  assert.deepEqual(appointmentKeys.detail(ID).slice(0, 1), appointmentKeys.all);
  assert.deepEqual(appointmentKeys.suggestions(ID), ["appointments", "detail", ID, "suggestions"]);
});

test("getAppointment: GET /appointments/{id} kèm Bearer, trả đúng dữ liệu; mã hóa ID", async () => {
  requests.length = 0;
  const data = await getAppointment(ID);
  assert.deepEqual(requests, [
    { method: "GET", url: `/api/v1/appointments/${ID}`, authorization: "Bearer manager-token", body: null },
  ]);
  assert.equal(data.appointmentId, ID);
  assert.equal(data.petId, PET_ID);

  await assert.rejects(getAppointment("a/b"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });
  assert.equal(requests[1].url, "/api/v1/appointments/a%2Fb");
});

test("updateAppointment: PUT /appointments/{id}, body đúng từng trường; bắt 409 STAFF_OUT_OF_SHIFT và thử lại với confirmOutOfShift", async () => {
  requests.length = 0;
  const reqBody = {
    petId: PET_ID,
    slotStart: "2026-11-23T09:00:00+07:00",
    serviceIds: [SERVICE_ID],
    staffIds: [STAFF_ID],
  };

  await assert.rejects(updateAppointment(ID, reqBody), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "STAFF_OUT_OF_SHIFT");
    return true;
  });

  assert.deepEqual(requests[0], {
    method: "PUT",
    url: `/api/v1/appointments/${ID}`,
    authorization: "Bearer manager-token",
    body: reqBody,
  });

  const res = await updateAppointment(ID, { ...reqBody, confirmOutOfShift: true });
  assert.deepEqual(res, { status: "Confirmed" });
  assert.deepEqual(requests[1], {
    method: "PUT",
    url: `/api/v1/appointments/${ID}`,
    authorization: "Bearer manager-token",
    body: { ...reqBody, confirmOutOfShift: true },
  });
});

test("cancelAppointment: POST /appointments/{id}/cancel body { reason: 'StoreUnable' }, bắt 409 INVALID_TRANSITION", async () => {
  requests.length = 0;
  const result = await cancelAppointment(ID, { reason: "StoreUnable" });
  assert.deepEqual(result, { status: "Cancelled" });
  assert.deepEqual(requests, [
    {
      method: "POST",
      url: `/api/v1/appointments/${ID}/cancel`,
      authorization: "Bearer manager-token",
      body: { reason: "StoreUnable" },
    },
  ]);

  await assert.rejects(cancelAppointment(STALE_ID, { reason: "CustomerBeyondDeadline" }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "INVALID_TRANSITION");
    return true;
  });
});

test("buildStoreDateTime: ghép ngày và giờ với độ lệch +07:00", () => {
  assert.equal(buildStoreDateTime("2026-11-23", "09:00"), "2026-11-23T09:00:00+07:00");
});
