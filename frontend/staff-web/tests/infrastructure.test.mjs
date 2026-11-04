import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { before, after } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AxiosError } from "axios";
import { MutationObserver } from "@tanstack/react-query";
import { ApiError, ERROR_MESSAGES, isErrorEnvelope, toApiError, getErrorMessage, isForbiddenError } from "../lib/api/errors.ts";
import { apiClient, setAccessTokenProvider } from "../lib/api/client.ts";
import { makeQueryClient } from "../lib/query-client.ts";
import { ErrorAlert } from "../components/feedback/error-alert.tsx";
import { FieldError } from "../components/feedback/field-error.tsx";
import { ForbiddenState } from "../components/feedback/forbidden-state.tsx";
const hits = new Map();
let baseURL;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

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
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true, writable: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(async () => {
  setAccessTokenProvider(() => null);
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete globalThis.window;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
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

test("server không thể đặt token provider hoặc gửi request dùng token trình duyệt", async () => {
  let tokenReads = 0;
  let dispatched = 0;
  const browserWindow = globalThis.window;
  setAccessTokenProvider(() => { tokenReads++; return "browser-token"; });
  delete globalThis.window;
  try {
    assert.throws(() => setAccessTokenProvider(() => "server-token"), /chỉ được sử dụng trong trình duyệt/);
    await Promise.all([1, 2].map(() => assert.rejects(apiClient.get("/echo", {
      baseURL,
      adapter: async (config) => { dispatched++; return { data: {}, status: 200, statusText: "OK", headers: {}, config }; },
    }), (error) => {
      assert.ok(error instanceof ApiError);
      assert.match(error.cause.message, /chỉ được sử dụng trong trình duyệt/);
      return true;
    })));
    assert.equal(tokenReads, 0);
    assert.equal(dispatched, 0);
  } finally {
    globalThis.window = browserWindow;
  }
  try {
    assert.equal((await apiClient.get("/echo", { baseURL })).data.authorization, "Bearer browser-token");
  } finally {
    setAccessTokenProvider(() => null);
  }
});

test("thiếu URL có thông báo cấu hình trong development, câu chung trong production và không retry", async () => {
  const originalMode = process.env.NODE_ENV;
  const client = makeQueryClient();
  try {
    for (const mode of ["development", "production"]) {
      process.env.NODE_ENV = mode;
      let attempts = 0;
      let dispatched = false;
      await assert.rejects(client.fetchQuery({
        queryKey: ["missing-config", mode],
        queryFn: () => {
          attempts++;
          return apiClient.get("/echo", { baseURL: " ", adapter: async () => { dispatched = true; } });
        },
        retryDelay: 0,
      }), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.kind, "configuration");
        assert.match(error.message, /NEXT_PUBLIC_API_BASE_URL/);
        if (mode === "development") assert.match(getErrorMessage(error), /NEXT_PUBLIC_API_BASE_URL/);
        else assert.equal(getErrorMessage(error), ERROR_MESSAGES.server);
        assert.equal(getErrorMessage(new Error("PRIVATE_DETAIL")), ERROR_MESSAGES.server);
        return true;
      });
      assert.equal(attempts, 1);
      assert.equal(dispatched, false);
    }
  } finally {
    if (originalMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalMode;
    client.clear();
  }
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
