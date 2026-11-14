import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { apiClient } from "../lib/api/client.ts";
import { ApiError, isForbiddenError } from "../lib/api/errors.ts";
import { createWalkInCustomer, listCustomers } from "../lib/api/endpoints/customers.ts";
import { createPet, getPet, listPets, updatePet } from "../lib/api/endpoints/pets.ts";
import { CUSTOMER_SEARCH_PAGE_SIZE, customerKeys } from "../lib/queries/customers.ts";
import { PETS_PAGE_SIZE, petKeys } from "../lib/queries/pets.ts";

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

const CUSTOMER = { customerId: "c1", fullName: "Ngô Thanh Bình", phone: "0962345118", email: null, isBookingLocked: false };
const PET = {
  petId: "p1",
  customerId: "c1",
  name: "Bông",
  species: "Dog",
  breed: "Poodle",
  temperament: "Normal",
  weightKg: 9,
  heightCm: 28,
  coatNote: null,
  notes: null,
  sizeGroup: "Small",
  isActive: true,
};
const PET_REQUEST = { name: "Bông", species: "Dog", breed: "Poodle", temperament: "Normal", weightKg: 9, heightCm: 28, coatNote: null, notes: null };

test("listCustomers: GET /customers gửi search, page, pageSize và trả trang kết quả", async () => {
  const page = { items: [CUSTOMER], page: 1, pageSize: CUSTOMER_SEARCH_PAGE_SIZE, total: 1 };
  reply(200, page);
  const result = await listCustomers({ search: "0962", page: 1, pageSize: CUSTOMER_SEARCH_PAGE_SIZE });
  assert.deepEqual(result, page);
  assert.deepEqual(requests, [
    {
      method: "GET",
      pathname: "/api/v1/customers",
      query: { search: "0962", page: "1", pageSize: String(CUSTOMER_SEARCH_PAGE_SIZE) },
      body: null,
    },
  ]);
});

test("createWalkInCustomer: POST /customers/walk-in chỉ gửi họ tên và số điện thoại", async () => {
  reply(201, { customerId: "c2" });
  const created = await createWalkInCustomer({ fullName: "Phạm An", phone: "0988123456" });
  assert.deepEqual(created, { customerId: "c2" });
  assert.deepEqual(requests, [
    {
      method: "POST",
      pathname: "/api/v1/customers/walk-in",
      query: {},
      body: { fullName: "Phạm An", phone: "0988123456" },
    },
  ]);
});

test("createWalkInCustomer: 409 DUPLICATE_CONTACT trả ApiError mang đúng status và code", async () => {
  reply(409, {
    status: 409,
    code: "DUPLICATE_CONTACT",
    title: "Thông tin liên hệ đã tồn tại",
    detail: "Thông tin liên hệ đã có, vui lòng chọn khách hàng hiện có.",
  });
  await assert.rejects(
    () => createWalkInCustomer({ fullName: "Khác", phone: "0962345118" }),
    (error) => error instanceof ApiError && error.status === 409 && error.code === "DUPLICATE_CONTACT",
  );
});

test("listPets: GET /pets kèm customerId, page, pageSize", async () => {
  const page = { items: [PET], page: 1, pageSize: PETS_PAGE_SIZE, total: 1 };
  reply(200, page);
  const result = await listPets({ customerId: "c1", page: 1, pageSize: PETS_PAGE_SIZE });
  assert.deepEqual(result, page);
  assert.deepEqual(requests, [
    {
      method: "GET",
      pathname: "/api/v1/pets",
      query: { customerId: "c1", page: "1", pageSize: String(PETS_PAGE_SIZE) },
      body: null,
    },
  ]);
});

test("getPet: GET /pets/{id}, mã được mã hóa trong đường dẫn", async () => {
  reply(200, PET);
  assert.deepEqual(await getPet("p1"), PET);
  assert.equal(requests[0].pathname, "/api/v1/pets/p1");

  reply(200, PET);
  await getPet("a b/c");
  assert.equal(requests[0].pathname, "/api/v1/pets/a%20b%2Fc");
});

test("createPet: POST /pets gửi nguyên request kèm customerId và trả petId, sizeGroup", async () => {
  reply(201, { petId: "p2", sizeGroup: "Small" });
  const body = { ...PET_REQUEST, customerId: "c1" };
  assert.deepEqual(await createPet(body), { petId: "p2", sizeGroup: "Small" });
  assert.deepEqual(requests, [{ method: "POST", pathname: "/api/v1/pets", query: {}, body }]);
});

test("updatePet: PUT /pets/{id} gửi request và trả sizeGroup", async () => {
  reply(200, { sizeGroup: "Medium" });
  assert.deepEqual(await updatePet({ petId: "p1", request: PET_REQUEST }), { sizeGroup: "Medium" });
  assert.deepEqual(requests, [{ method: "PUT", pathname: "/api/v1/pets/p1", query: {}, body: PET_REQUEST }]);
});

test("lỗi 403, 404 và 400 từ API thú cưng và khách hàng giữ nguyên status, code, detail", async () => {
  reply(403, { status: 403, code: "FORBIDDEN", title: "Không có quyền", detail: null });
  await assert.rejects(() => listCustomers({ search: "09" }), (error) => isForbiddenError(error));

  reply(404, { status: 404, code: "NOT_FOUND", title: "Không tìm thấy", detail: null });
  await assert.rejects(() => getPet("khong-co"), (error) => error instanceof ApiError && error.status === 404 && error.code === "NOT_FOUND");

  reply(400, { status: 400, code: "VALIDATION_ERROR", title: "Dữ liệu không hợp lệ", detail: "Khách hàng không tồn tại." });
  await assert.rejects(
    () => createPet({ ...PET_REQUEST, customerId: "khong-co" }),
    (error) => error instanceof ApiError && error.status === 400 && error.detail === "Khách hàng không tồn tại.",
  );
});

test("khóa query: danh sách khách theo từ khóa, thú cưng theo khách và theo mã", () => {
  assert.deepEqual(customerKeys.all, ["customers"]);
  assert.deepEqual(customerKeys.search("0962"), ["customers", "search", "0962"]);
  assert.deepEqual(customerKeys.search(null), ["customers", "search", null]);
  assert.deepEqual(petKeys.all, ["pets"]);
  assert.deepEqual(petKeys.list("c1"), ["pets", "list", "c1"]);
  assert.deepEqual(petKeys.detail("p1"), ["pets", "detail", "p1"]);
  assert.deepEqual(petKeys.detail(null), ["pets", "detail", null]);
  assert.equal(CUSTOMER_SEARCH_PAGE_SIZE, 20);
  assert.equal(PETS_PAGE_SIZE, 100);
});
