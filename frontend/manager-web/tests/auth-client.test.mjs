import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { before, after, beforeEach } from "node:test";
import { apiClient, setAccessTokenProvider, setSessionHandlers } from "../lib/api/client.ts";
import { ApiError } from "../lib/api/errors.ts";
import { refreshAccessToken, singleFlight } from "../lib/auth/session-client.ts";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const hits = [];
let baseURL;

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  hits.push({ path: url.pathname, authorization: request.headers.authorization ?? null });
  response.setHeader("Content-Type", "application/json");
  const fresh = request.headers.authorization === "Bearer fresh";
  if (url.pathname === "/api/v1/secure" && fresh) return response.end(JSON.stringify({ ok: true }));
  response.statusCode = url.pathname === "/api/v1/teapot" ? 418 : 401;
  response.end(JSON.stringify({ status: response.statusCode, code: "UNAUTHENTICATED", title: "Chưa xác thực" }));
});

before(async () => {
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true, writable: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(async () => {
  setSessionHandlers(null);
  setAccessTokenProvider(() => null);
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete globalThis.window;
  await new Promise((resolve) => server.close(resolve));
});
beforeEach(() => {
  hits.length = 0;
  setSessionHandlers(null);
  setAccessTokenProvider(() => "stale");
});

test("401 + làm mới thành công: gửi lại đúng một lần với token mới", async () => {
  let refreshed = 0;
  let expired = 0;
  setSessionHandlers({ refresh: async () => { refreshed++; setAccessTokenProvider(() => "fresh"); }, onExpired: () => { expired++; } });
  const { data } = await apiClient.get("/secure", { baseURL });
  assert.deepEqual(data, { ok: true });
  assert.deepEqual(hits.map((hit) => hit.authorization), ["Bearer stale", "Bearer fresh"]);
  assert.equal(refreshed, 1);
  assert.equal(expired, 0);
});

test("làm mới bị từ chối (401): báo hết phiên một lần và trả lỗi 401 gốc", async () => {
  let expired = 0;
  setSessionHandlers({
    refresh: async () => { throw new ApiError({ kind: "http", status: 401, code: "UNAUTHENTICATED" }); },
    onExpired: () => { expired++; },
  });
  await assert.rejects(apiClient.get("/secure", { baseURL }), (error) => error instanceof ApiError && error.status === 401);
  assert.equal(expired, 1);
  assert.equal(hits.length, 1);
});

test("làm mới gặp lỗi tạm (429): không báo hết phiên, trả đúng lỗi làm mới", async () => {
  let expired = 0;
  setSessionHandlers({
    refresh: async () => { throw new ApiError({ kind: "http", status: 429, code: "RATE_LIMITED" }); },
    onExpired: () => { expired++; },
  });
  await assert.rejects(apiClient.get("/secure", { baseURL }), (error) => error instanceof ApiError && error.status === 429);
  assert.equal(expired, 0);
});

test("request gửi lại vẫn 401: không làm mới lần hai", async () => {
  let refreshed = 0;
  setSessionHandlers({ refresh: async () => { refreshed++; setAccessTokenProvider(() => "still-bad"); }, onExpired: () => {} });
  await assert.rejects(apiClient.get("/secure", { baseURL }), (error) => error instanceof ApiError && error.status === 401);
  assert.equal(refreshed, 1);
  assert.equal(hits.length, 2);
});

test("đường dẫn /auth/* và lỗi không phải 401 không kích hoạt làm mới", async () => {
  let refreshed = 0;
  setSessionHandlers({ refresh: async () => { refreshed++; setAccessTokenProvider(() => "fresh"); }, onExpired: () => {} });
  await assert.rejects(apiClient.post("/auth/login", {}, { baseURL }), (error) => error.status === 401);
  await assert.rejects(apiClient.get("/teapot", { baseURL }), (error) => error.status === 418);
  assert.equal(refreshed, 0);
});

test("singleFlight: lời gọi đồng thời dùng chung một lần chạy; xong rồi thì chạy lại được", async () => {
  let runs = 0;
  const task = singleFlight(async () => {
    runs++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return `token-${runs}`;
  });
  const results = await Promise.all([task(), task(), task()]);
  assert.deepEqual(results, ["token-1", "token-1", "token-1"]);
  assert.equal(await task(), "token-2");
  const failing = singleFlight(async () => { throw new Error("lỗi"); });
  await assert.rejects(failing(), /lỗi/);
  await assert.rejects(failing(), /lỗi/);
});

test("refreshAccessToken dùng navigator.locks khi có để tuần tự hóa đa tab", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let lockedName = null;
  let lockCalls = 0;
  Object.defineProperty(globalThis, "navigator", {
    value: {
      locks: {
        request: async (name, callback) => {
          lockedName = name;
          lockCalls++;
          return callback();
        },
      },
    },
    configurable: true,
    writable: true,
  });

  try {
    await assert.rejects(refreshAccessToken());
    assert.equal(lockedName, "ps_manager_session_refresh");
    assert.equal(lockCalls, 1);
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  }
});
