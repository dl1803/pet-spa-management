import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test, { before, after } from "node:test";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();

// Biên dịch nguồn trong bộ nhớ bằng TypeScript đã có; không sinh file hay thêm test runner.
function loadSource(filename) {
  filename = path.resolve(root, filename);
  if (!path.extname(filename)) filename += existsSync(`${filename}.ts`) ? ".ts" : ".tsx";
  if (modules.has(filename)) return modules.get(filename);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const compiled = { exports: {} };
  new Function("require", "module", "exports", code)((name) => {
    if (name.startsWith("@/")) return loadSource(name.slice(2));
    if (name.startsWith(".")) return loadSource(path.resolve(path.dirname(filename), name));
    return require(name);
  }, compiled, compiled.exports);
  modules.set(filename, compiled.exports);
  return compiled.exports;
}

const { ApiError, ERROR_CODES, ERROR_MESSAGES, isErrorEnvelope, toApiError, getErrorMessage, isForbiddenError } = loadSource("lib/api/errors.ts");
const { apiClient, setAccessTokenProvider } = loadSource("lib/api/client.ts");
const { makeQueryClient } = loadSource("lib/query-client.ts");
const hits = new Map();
let baseURL;

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  hits.set(url.pathname, (hits.get(url.pathname) ?? 0) + 1);
  response.setHeader("Content-Type", "application/problem+json");
  if (url.pathname === "/api/v1/malformed") {
    response.statusCode = 400;
    response.setHeader("Content-Type", "text/html");
    response.end("<html>PRIVATE_STACK_TRACE</html>");
  } else if (url.pathname.startsWith("/api/v1/error/")) {
    response.statusCode = Number(url.pathname.split("/").at(-1));
    response.end(JSON.stringify({ status: 409, code: "SLOT_FULL", title: "Khung giờ đã kín", detail: "Vui lòng chọn khung giờ khác." }));
  } else {
    response.end(JSON.stringify({ authorization: request.headers.authorization ?? null, contentType: request.headers["content-type"] }));
  }
});

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(async () => {
  setAccessTokenProvider(() => null);
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("25 mã lỗi khớp contract backend", () => {
  const backend = readFileSync(path.resolve(root, "../../backend/src/PetSpa.Domain/Exceptions/ErrorCodes.cs"), "utf8");
  const codes = [...backend.matchAll(/= "([A-Z_]+)"/g)].map((match) => match[1]);
  assert.equal(ERROR_CODES.length, 25);
  assert.deepEqual([...ERROR_CODES].sort(), codes.sort());
});

test("envelope sai kiểu bị từ chối; lỗi lạ và lỗi 500 không lộ chi tiết", () => {
  for (const value of [null, [], {}, { status: "409", title: "Lỗi" }, { status: NaN, title: "Lỗi" }, { status: 200, title: "Lỗi" }, { status: 409, title: "Lỗi", detail: 1 }]) {
    assert.equal(isErrorEnvelope(value), false);
  }
  assert.equal(isErrorEnvelope({ status: 409, title: "Lỗi" }), true);
  assert.equal(getErrorMessage(new Error("private stack trace")), ERROR_MESSAGES.server);
  assert.equal(getErrorMessage(new ApiError({ kind: "http", status: 500, detail: "private database error" })), ERROR_MESSAGES.server);
  assert.equal(getErrorMessage(new ApiError({ kind: "http", status: 409, detail: " ", title: "Khung giờ đã kín" })), "Khung giờ đã kín");
  assert.equal(getErrorMessage(new ApiError({ kind: "http", status: 409, detail: " ", title: " " })), ERROR_MESSAGES.server);
  const error = new ApiError({ kind: "network" });
  assert.equal(toApiError(error), error);
  assert.equal(getErrorMessage(error), ERROR_MESSAGES.network);
});

test("phân biệt 403 quyền truy cập, khóa đặt lịch và 429", () => {
  const forbidden = new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" });
  const locked = new ApiError({ kind: "http", status: 403, code: "BOOKING_LOCKED", detail: "Tài khoản bị khóa đặt lịch" });
  assert.equal(isForbiddenError(forbidden), true);
  assert.equal(isForbiddenError(locked), false);
  assert.equal(getErrorMessage(forbidden), ERROR_MESSAGES.forbiddenTitle);
  assert.equal(getErrorMessage(locked), "Tài khoản bị khóa đặt lịch");
  assert.equal(getErrorMessage(new ApiError({ kind: "http", status: 429 })), ERROR_MESSAGES.rateLimited);
});

test("Axios không gửi request khi thiếu baseURL; token lấy mới mỗi request", async () => {
  let dispatched = false;
  await assert.rejects(apiClient.get("/echo", { baseURL: "", adapter: async () => { dispatched = true; } }), ApiError);
  assert.equal(dispatched, false);
  let token = "first-token";
  setAccessTokenProvider(() => token);
  try {
    assert.equal((await apiClient.get("/echo", { baseURL })).data.authorization, "Bearer first-token");
    token = "second-token";
    assert.equal((await apiClient.get("/echo", { baseURL })).data.authorization, "Bearer second-token");
    token = null;
    const { data } = await apiClient.get("/echo", { baseURL });
    assert.equal(data.authorization, null);
    assert.match(data.contentType, /application\/json/);
  } finally {
    setAccessTokenProvider(() => null);
  }
});

test("HTTP status thực tế có ưu tiên hơn status trong body", async () => {
  await assert.rejects(apiClient.get("/error/500", { baseURL }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 500);
    assert.equal(error.code, "SLOT_FULL");
    assert.equal(getErrorMessage(error), ERROR_MESSAGES.server);
    return true;
  });
});

test("response không có envelope và Axios network dùng câu chung", async () => {
  await assert.rejects(apiClient.get("/malformed", { baseURL }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.kind, "http");
    assert.equal(error.status, 400);
    assert.equal(error.code, null);
    assert.equal(getErrorMessage(error), ERROR_MESSAGES.server);
    return true;
  });
  const { AxiosError } = require("axios");
  const network = toApiError(new AxiosError("PRIVATE_NETWORK_DETAIL", "ERR_NETWORK"));
  assert.equal(network.kind, "network");
  assert.equal(getErrorMessage(network), ERROR_MESSAGES.network);
});

test("Query không retry 4xx; lỗi mạng/5xx tối đa 3 lần; cache độc lập", async () => {
  const client = makeQueryClient();
  const other = makeQueryClient();
  try {
    for (const status of [400, 401, 403, 404, 409, 429, 500]) {
      const endpoint = `/api/v1/error/${status}`;
      hits.set(endpoint, 0);
      await assert.rejects(client.fetchQuery({ queryKey: [status], queryFn: () => apiClient.get(`/error/${status}`, { baseURL }), retryDelay: 0 }), ApiError);
      assert.equal(hits.get(endpoint), status === 500 ? 4 : 1);
    }
    let attempts = 0;
    await assert.rejects(client.fetchQuery({ queryKey: ["network"], queryFn: () => { attempts++; throw new ApiError({ kind: "network" }); }, retryDelay: 0 }), ApiError);
    assert.equal(attempts, 4);
    client.setQueryData(["isolated"], "first");
    assert.equal(other.getQueryData(["isolated"]), undefined);
    const { MutationObserver } = require("@tanstack/react-query");
    attempts = 0;
    const mutation = new MutationObserver(client, { mutationFn: async () => { attempts++; throw new ApiError({ kind: "http", status: 500 }); } });
    await assert.rejects(mutation.mutate(), ApiError);
    assert.equal(attempts, 1);
  } finally {
    client.clear();
    other.clear();
  }
});

test("feedback có thông báo trợ năng, ID lỗi trường và escape nội dung", () => {
  const { ErrorAlert } = loadSource("components/feedback/error-alert.tsx");
  const { FieldError } = loadSource("components/feedback/field-error.tsx");
  const { ForbiddenState } = loadSource("components/feedback/forbidden-state.tsx");
  assert.equal(renderToStaticMarkup(React.createElement(ErrorAlert, { error: null })), "");
  assert.equal(renderToStaticMarkup(React.createElement(FieldError, {})), "");
  const alert = renderToStaticMarkup(React.createElement(ErrorAlert, { error: new ApiError({ kind: "http", status: 429 }) }));
  assert.match(alert, /role="alert"/);
  assert.ok(alert.includes(ERROR_MESSAGES.rateLimited));
  const field = renderToStaticMarkup(React.createElement(FieldError, { id: "name-error", message: "<script>private</script>" }));
  assert.match(field, /id="name-error"/);
  assert.ok(!field.includes("<script>"));
  assert.ok(renderToStaticMarkup(React.createElement(ForbiddenState)).includes(ERROR_MESSAGES.forbiddenTitle));
});
