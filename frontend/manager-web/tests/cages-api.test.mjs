import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { ApiError, getErrorMessage, isForbiddenError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { createCage, listCages, setCageStatus, updateCage } from "../lib/api/endpoints/cages.ts";
import { CAGE_PAGE_SIZE, cageKeys } from "../lib/queries/cages.ts";

const requests = [];
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalBaseURL = apiClient.defaults.baseURL;

const cagePage = {
  items: [
    {
      cageId: "cage-1",
      code: "B1",
      species: "Dog",
      sizeGroup: "Small",
      isActive: true,
      occupant: null,
    },
  ],
  page: 1,
  pageSize: 100,
  total: 1,
};

const server = createServer((incoming, response) => {
  let body = "";
  incoming.on("data", (chunk) => { body += chunk; });
  incoming.on("end", () => {
    const { method, url } = incoming;
    const authorization = incoming.headers.authorization ?? null;
    const parsedBody = body ? JSON.parse(body) : null;
    requests.push({ method, url, authorization, body: parsedBody });
    response.setHeader("Content-Type", "application/json");

    if (method === "GET" && (url === "/api/v1/cages" || url?.startsWith("/api/v1/cages?"))) {
      response.end(JSON.stringify(cagePage));
    } else if (method === "POST" && url === "/api/v1/cages") {
      if (parsedBody?.code === "DUP") {
        response.statusCode = 409;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(JSON.stringify({
          status: 409,
          code: "DUPLICATE_CAGE_CODE",
          title: "Trùng mã chuồng",
          detail: "Mã chuồng đã tồn tại.",
        }));
        return;
      }
      response.statusCode = 201;
      response.end(JSON.stringify({ cageId: "cage-created" }));
    } else if (method === "PUT" && url?.startsWith("/api/v1/cages/")) {
      const id = decodeURIComponent(url.slice("/api/v1/cages/".length));
      if (id === "missing") {
        response.statusCode = 404;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(JSON.stringify({
          status: 404,
          code: "NOT_FOUND",
          title: "Không tìm thấy",
          detail: "Không tìm thấy chuồng.",
        }));
        return;
      }
      if (parsedBody?.code === "DUP") {
        response.statusCode = 409;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(JSON.stringify({
          status: 409,
          code: "DUPLICATE_CAGE_CODE",
          title: "Trùng mã chuồng",
          detail: "Mã chuồng đã tồn tại.",
        }));
        return;
      }
      response.statusCode = 200;
      response.end();
    } else if (method === "PATCH" && url?.startsWith("/api/v1/cages/") && url.endsWith("/status")) {
      const id = decodeURIComponent(url.slice("/api/v1/cages/".length, -"/status".length));
      if (id === "missing") {
        response.statusCode = 404;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(JSON.stringify({
          status: 404,
          code: "NOT_FOUND",
          title: "Không tìm thấy",
          detail: "Không tìm thấy chuồng.",
        }));
        return;
      }
      if (authorization === "Bearer forbidden-token") {
        response.statusCode = 403;
        response.setHeader("Content-Type", "application/problem+json");
        response.end(JSON.stringify({
          status: 403,
          code: "FORBIDDEN",
          title: "Không có quyền truy cập",
          detail: "Bạn không có quyền thực hiện thao tác này.",
        }));
        return;
      }
      response.statusCode = 204;
      response.end();
    } else {
      response.statusCode = 404;
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

test("cageKeys: khóa gốc và khóa danh sách chuẩn cho mutation làm mới", () => {
  assert.deepEqual(cageKeys.all, ["cages"]);
  assert.deepEqual(cageKeys.list(), ["cages", "list", { page: 1, pageSize: CAGE_PAGE_SIZE }]);
  assert.deepEqual(cageKeys.list({ page: 2, pageSize: 20 }), ["cages", "list", { page: 2, pageSize: 20 }]);
});

test("listCages: gửi GET /cages với tham số phân trang và trả CagePage", async () => {
  requests.length = 0;
  const page = await listCages({ page: 1, pageSize: 100 });
  assert.deepEqual(requests, [
    { method: "GET", url: "/api/v1/cages?page=1&pageSize=100", authorization: "Bearer manager-token", body: null },
  ]);
  assert.deepEqual(page, cagePage);
});

test("createCage: POST /cages trả 201 { cageId }; 409 DUPLICATE_CAGE_CODE giữ ApiError", async () => {
  requests.length = 0;
  const created = await createCage({ code: "B2", sizeGroup: "Medium", species: "Dog" });
  assert.deepEqual(created, { cageId: "cage-created" });
  assert.deepEqual(requests[0], {
    method: "POST",
    url: "/api/v1/cages",
    authorization: "Bearer manager-token",
    body: { code: "B2", sizeGroup: "Medium", species: "Dog" },
  });

  await assert.rejects(createCage({ code: "DUP", sizeGroup: "Small", species: "Cat" }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "DUPLICATE_CAGE_CODE");
    assert.equal(getErrorMessage(error), "Mã chuồng đã tồn tại.");
    return true;
  });
});

test("updateCage: PUT /cages/{id} mã hóa id, chấp nhận 200 rỗng, giữ 404 và 409", async () => {
  requests.length = 0;
  await updateCage("a b/c", { code: "B1A", sizeGroup: "Large", species: "Dog" });
  assert.deepEqual(requests[0], {
    method: "PUT",
    url: "/api/v1/cages/a%20b%2Fc",
    authorization: "Bearer manager-token",
    body: { code: "B1A", sizeGroup: "Large", species: "Dog" },
  });

  await assert.rejects(updateCage("missing", { code: "B1A", sizeGroup: "Large", species: "Dog" }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });

  await assert.rejects(updateCage("cage-1", { code: "DUP", sizeGroup: "Small", species: "Cat" }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 409);
    assert.equal(error.code, "DUPLICATE_CAGE_CODE");
    return true;
  });
});

test("setCageStatus: PATCH /cages/{id}/status mã hóa id, gửi { isActive }, giữ 404 và 403", async () => {
  requests.length = 0;
  await setCageStatus("a/b", false);
  assert.deepEqual(requests[0], {
    method: "PATCH",
    url: "/api/v1/cages/a%2Fb/status",
    authorization: "Bearer manager-token",
    body: { isActive: false },
  });

  await assert.rejects(setCageStatus("missing", true), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    return true;
  });

  setAccessTokenProvider(() => "forbidden-token");
  try {
    await assert.rejects(setCageStatus("cage-1", false), (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403);
      assert.equal(isForbiddenError(error), true);
      return true;
    });
  } finally {
    setAccessTokenProvider(() => "manager-token");
  }
});
