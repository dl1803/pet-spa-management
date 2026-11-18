import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError, getErrorMessage } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { createStaff, deactivateStaff, listStaff, updateStaff } from "../lib/api/endpoints/staff.ts";
import { appointmentKeys } from "../lib/queries/appointments.ts";
import { STAFF_PAGE_SIZE, staffKeys } from "../lib/queries/staff.ts";

const STAFF_ID = "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f01";
const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

const createRequest = { userName: "0944120678", fullName: "Huỳnh Gia Hân", staffRole: "SpaStaff", password: "Mk@12345" };
const updateRequest = { fullName: "Huỳnh Gia Hân", staffRole: "Receptionist" };

const server = createServer((incoming, response) => {
  let body = "";
  incoming.on("data", (chunk) => { body += chunk; });
  incoming.on("end", () => {
    const { method, url } = incoming;
    requests.push({ method, url, authorization: incoming.headers.authorization ?? null, body: body ? JSON.parse(body) : null });
    response.setHeader("Content-Type", "application/json");
    if (method === "GET" && url === "/api/v1/staff?page=1&pageSize=100") {
      response.end(JSON.stringify({
        page: 1,
        pageSize: 100,
        total: 2,
        items: [
          { staffId: STAFF_ID, userName: "0905667812", fullName: "Lê Minh Tâm", staffRole: "SpaStaff", isActive: true },
          { staffId: "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f04", userName: "0918402773", fullName: "Đặng Hoàng Phúc", staffRole: "SpaStaff", isActive: false },
        ],
      }));
    } else if (method === "POST" && url === "/api/v1/staff" && JSON.parse(body).userName === "0944120678") {
      response.statusCode = 201;
      response.end(JSON.stringify({ staffId: STAFF_ID }));
    } else if (method === "POST" && url === "/api/v1/staff") {
      response.statusCode = 409;
      response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify({ status: 409, code: "DUPLICATE_CONTACT", title: "Thông tin liên hệ đã được sử dụng", detail: "Thông tin liên hệ này đã được sử dụng." }));
    } else if (method === "PUT" && url === `/api/v1/staff/${STAFF_ID}`) {
      response.end();
    } else if (method === "POST" && url === `/api/v1/staff/${STAFF_ID}/deactivate`) {
      response.end(JSON.stringify({ returnedToPending: 2 }));
    } else if (url.startsWith("/api/v1/staff/missing")) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify({ status: 404, code: "NOT_FOUND", title: "Không tìm thấy", detail: "Không tìm thấy dữ liệu được yêu cầu." }));
    } else {
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/problem+json");
      response.end(JSON.stringify({ status: 400, code: "VALIDATION_ERROR", title: "Dữ liệu không hợp lệ", detail: "Họ tên không hợp lệ." }));
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

test("khóa query nhân viên: danh sách nằm dưới khóa gốc; số dòng mỗi trang là 100", () => {
  assert.deepEqual(staffKeys.all, ["staff"]);
  const key = staffKeys.list({ page: 1, pageSize: STAFF_PAGE_SIZE });
  assert.deepEqual(key, ["staff", "list", { page: 1, pageSize: 100 }]);
  assert.deepEqual(key.slice(0, staffKeys.all.length), [...staffKeys.all]);
  // Vô hiệu hóa nhân viên spa làm đổi lịch hẹn: khóa gốc của lịch hẹn phải khác khóa nhân viên để làm mới riêng từng nhóm.
  assert.notDeepEqual(staffKeys.all, appointmentKeys.all);
});

test("listStaff: GET /staff?page=1&pageSize=100 kèm Bearer, trả cả tài khoản đã vô hiệu hóa", async () => {
  requests.length = 0;
  const page = await listStaff({ page: 1, pageSize: STAFF_PAGE_SIZE });
  assert.deepEqual(requests, [{ method: "GET", url: "/api/v1/staff?page=1&pageSize=100", authorization: "Bearer manager-token", body: null }]);
  assert.equal(page.total, 2);
  assert.deepEqual(page.items.map((item) => item.isActive), [true, false]);
});

test("createStaff: POST /staff gửi đúng body và trả staffId", async () => {
  requests.length = 0;
  const created = await createStaff(createRequest);
  assert.deepEqual(created, { staffId: STAFF_ID });
  assert.deepEqual(requests, [{ method: "POST", url: "/api/v1/staff", authorization: "Bearer manager-token", body: createRequest }]);
});

test("createStaff: 409 DUPLICATE_CONTACT giữ mã lỗi để form hiện dưới ô số điện thoại", async () => {
  await assert.rejects(createStaff({ ...createRequest, userName: "0912334501" }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "DUPLICATE_CONTACT");
    return true;
  });
});

test("updateStaff: PUT /staff/{id} chỉ gửi họ tên và vai trò, chấp nhận 200 không nội dung", async () => {
  requests.length = 0;
  await updateStaff(STAFF_ID, updateRequest);
  assert.deepEqual(requests, [{ method: "PUT", url: `/api/v1/staff/${STAFF_ID}`, authorization: "Bearer manager-token", body: updateRequest }]);
});

test("deactivateStaff: POST /staff/{id}/deactivate không có body, trả returnedToPending", async () => {
  requests.length = 0;
  const result = await deactivateStaff(STAFF_ID);
  assert.deepEqual(result, { returnedToPending: 2 });
  assert.deepEqual(requests, [{ method: "POST", url: `/api/v1/staff/${STAFF_ID}/deactivate`, authorization: "Bearer manager-token", body: null }]);
});

test("mã nhân viên được mã hóa trong đường dẫn", async () => {
  requests.length = 0;
  await assert.rejects(updateStaff("a/b", updateRequest), ApiError);
  await assert.rejects(deactivateStaff("a/b"), ApiError);
  assert.deepEqual(requests.map((item) => item.url), ["/api/v1/staff/a%2Fb", "/api/v1/staff/a%2Fb/deactivate"]);
});

test("lỗi 404 và 400 giữ mã lỗi và câu của backend", async () => {
  await assert.rejects(deactivateStaff("missing"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });
  await assert.rejects(updateStaff("invalid", updateRequest), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.code, "VALIDATION_ERROR");
    assert.equal(getErrorMessage(error), "Họ tên không hợp lệ.");
    return true;
  });
});
