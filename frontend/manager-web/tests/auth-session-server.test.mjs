import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { before, after, beforeEach } from "node:test";
import { NextRequest } from "next/server";
import { handleLogin, handleLogout, handleRefresh } from "../lib/auth/session-server.ts";

const ORIGIN = "http://localhost:3002";
const calls = [];
let baseUrl;
let refreshStatus;
let meBody;

let loginBodyRaw = null;
let refreshBodyRaw = null;
let meBodyRaw = null;

const server = createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const path = request.url.replace("/api/v1", "");
  calls.push({ path, method: request.method, authorization: request.headers.authorization ?? null, forwarded: request.headers["x-forwarded-for"] ?? null, body });
  response.setHeader("Content-Type", "application/json");
  const fail = (status, code) => { response.statusCode = status; response.end(JSON.stringify({ status, code, title: "Lỗi", detail: "Chi tiết" })); };

  if (path === "/auth/login") {
    if (loginBodyRaw !== null) return response.end(loginBodyRaw);
    if (body.password !== "đúng") return fail(401, "UNAUTHENTICATED");
    return response.end(JSON.stringify({ accessToken: "access-1", refreshToken: "refresh+/=1" }));
  }
  if (path === "/me") return response.end(meBodyRaw !== null ? meBodyRaw : JSON.stringify(meBody));
  if (path === "/auth/refresh") {
    if (refreshBodyRaw !== null) return response.end(refreshBodyRaw);
    if (refreshStatus !== 200) return fail(refreshStatus, refreshStatus === 429 ? "RATE_LIMITED" : "UNAUTHENTICATED");
    return response.end(JSON.stringify({ accessToken: "access-2", refreshToken: "refresh-2" }));
  }
  if (path === "/auth/logout") { response.statusCode = 204; return response.end(); }
  return fail(404, "NOT_FOUND");
});

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;
});
after(() => new Promise((resolve) => server.close(resolve)));
beforeEach(() => {
  calls.length = 0;
  refreshStatus = 200;
  loginBodyRaw = null;
  refreshBodyRaw = null;
  meBodyRaw = null;
  meBody = { userId: "u1", userName: "0900000001", role: "Manager", staffRole: null };
});

function post(path, { body, cookie, origin = ORIGIN, headers = {} } = {}) {
  return new NextRequest(`${ORIGIN}/api/session/${path}`, {
    method: "POST",
    headers: {
      host: "localhost:3002",
      ...(origin === null ? {} : { origin }),
      "content-type": "application/json",
      ...(cookie ? { cookie: `ps_manager_rt=${encodeURIComponent(cookie)}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function refreshCookie(response) {
  return response.cookies.get("ps_manager_rt");
}

test("login: role Manager → đặt cookie httpOnly, trả accessToken + me, không trả refresh token", async () => {
  const response = await handleLogin(post("login", { body: { userName: "0900000001", password: "đúng" }, headers: { "x-forwarded-for": "203.0.113.7" } }));
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.accessToken, "access-1");
  assert.equal(json.me.role, "Manager");
  assert.equal("refreshToken" in json, false);
  const cookie = refreshCookie(response);
  assert.equal(cookie.value, "refresh+/=1");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/");
  assert.equal(cookie.maxAge, 604800);
  assert.equal(cookie.secure, false);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls[0].forwarded, "203.0.113.7");
  assert.equal(calls[1].authorization, "Bearer access-1");
});

test("login qua https: cookie có Secure", async () => {
  const request = new NextRequest("https://manager.example/api/session/login", {
    method: "POST",
    headers: { host: "manager.example", origin: "https://manager.example", "content-type": "application/json" },
    body: JSON.stringify({ userName: "0900000002", password: "đúng" }),
  });
  assert.equal(refreshCookie(await handleLogin(request)).secure, true);
});

test("login: sai thông tin chuyển nguyên lỗi 401 và không đặt cookie", async () => {
  const response = await handleLogin(post("login", { body: { userName: "0900000001", password: "sai" } }));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "UNAUTHENTICATED");
  assert.equal(refreshCookie(response), undefined);
  assert.equal(calls.length, 1);
});

test("login: role không phải Manager → 403, thu hồi refresh token, không đặt cookie", async () => {
  for (const wrong of [
    { userId: "u3", userName: "0900000003", role: "Staff", staffRole: "Receptionist" },
    { userId: "u4", userName: "0900000004", role: "Staff", staffRole: "SpaStaff" },
    { userId: "u5", userName: "0900000005", role: "Customer", staffRole: null },
  ]) {
    calls.length = 0;
    meBody = wrong;
    const response = await handleLogin(post("login", { body: { userName: wrong.userName, password: "đúng" } }));
    assert.equal(response.status, 403);
    const json = await response.json();
    assert.equal(json.code, "FORBIDDEN");
    assert.equal(json.title, "Tài khoản không có quyền truy cập web này");
    assert.equal(refreshCookie(response), undefined);
    const logout = calls.at(-1);
    assert.equal(logout.path, "/auth/logout");
    assert.equal(logout.authorization, "Bearer access-1");
    assert.deepEqual(logout.body, { refreshToken: "refresh+/=1" });
  }
});

test("login: thiếu trường, body hỏng → 400 VALIDATION_ERROR và không gọi backend", async () => {
  for (const body of [{}, { userName: "0900000001" }, { userName: 1, password: "x" }, { userName: "", password: "x" }]) {
    const response = await handleLogin(post("login", { body }));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "VALIDATION_ERROR");
  }
  const broken = new NextRequest(`${ORIGIN}/api/session/login`, { method: "POST", headers: { host: "localhost:3002", origin: ORIGIN }, body: "{" });
  assert.equal((await handleLogin(broken)).status, 400);
  assert.equal(calls.length, 0);
});

test("mọi route từ chối yêu cầu khác origin (gồm khác protocol) hoặc không có Origin", async () => {
  for (const handler of [handleLogin, handleRefresh, handleLogout]) {
    for (const origin of ["http://evil.example", "https://localhost:3002", null]) {
      const response = await handler(post("x", { body: { userName: "a", password: "b" }, cookie: "t", origin }));
      assert.equal(response.status, 403);
    }
  }
  assert.equal(calls.length, 0);
});

test("x-forwarded-for nhiều chặng chỉ lấy IP ngoài cùng; x-forwarded-proto=https khớp origin https", async () => {
  const request = new NextRequest("http://manager.example/api/session/login", {
    method: "POST",
    headers: {
      host: "manager.example",
      origin: "https://manager.example",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "10.0.0.1, 203.0.113.7",
      "content-type": "application/json",
    },
    body: JSON.stringify({ userName: "0900000001", password: "đúng" }),
  });
  const response = await handleLogin(request);
  assert.equal(response.status, 200);
  assert.equal(refreshCookie(response).secure, true);
  assert.equal(calls[0].forwarded, "203.0.113.7");
});

test("backend trả 200 rỗng hoặc sai cấu trúc → 502 thay vì lỗi 500; giữ cookie khi refresh", async () => {
  loginBodyRaw = "";
  const badLogin = await handleLogin(post("login", { body: { userName: "0900000001", password: "đúng" } }));
  assert.equal(badLogin.status, 502);

  loginBodyRaw = null;
  meBodyRaw = "<html>bad</html>";
  const badMe = await handleLogin(post("login", { body: { userName: "0900000001", password: "đúng" } }));
  assert.equal(badMe.status, 502);
  assert.equal(calls.at(-1).path, "/auth/logout");

  refreshBodyRaw = "not-json";
  const badRefresh = await handleRefresh(post("refresh", { cookie: "t" }));
  assert.equal(badRefresh.status, 502);
  assert.equal(refreshCookie(badRefresh), undefined);
});

test("refresh: không có cookie → 401, không gọi backend", async () => {
  const response = await handleRefresh(post("refresh"));
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test("refresh: thành công ghi đè cookie bằng refresh token mới và chỉ trả accessToken", async () => {
  const response = await handleRefresh(post("refresh", { cookie: "refresh+/=1" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accessToken: "access-2" });
  assert.equal(refreshCookie(response).value, "refresh-2");
  assert.deepEqual(calls[0].body, { refreshToken: "refresh+/=1" });
});

test("refresh: backend từ chối (401) → xóa cookie; lỗi tạm (429, 5xx) → giữ cookie", async () => {
  refreshStatus = 401;
  const rejected = await handleRefresh(post("refresh", { cookie: "t" }));
  assert.equal(rejected.status, 401);
  assert.equal(refreshCookie(rejected).maxAge, 0);
  assert.equal(refreshCookie(rejected).sameSite, "lax");

  const httpsRejected = await handleRefresh(
    new NextRequest("https://manager.example/api/session/refresh", {
      method: "POST",
      headers: { host: "manager.example", origin: "https://manager.example", cookie: "ps_manager_rt=t" },
    }),
  );
  assert.equal(httpsRejected.status, 401);
  assert.equal(refreshCookie(httpsRejected).maxAge, 0);
  assert.equal(refreshCookie(httpsRejected).sameSite, "lax");
  assert.equal(refreshCookie(httpsRejected).secure, true);

  refreshStatus = 429;
  const limited = await handleRefresh(post("refresh", { cookie: "t" }));
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).code, "RATE_LIMITED");
  assert.equal(refreshCookie(limited), undefined);

  refreshStatus = 503;
  assert.equal((await handleRefresh(post("refresh", { cookie: "t" }))).status, 503);
});

test("backend không kết nối được → 502, giữ cookie", async () => {
  const original = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:1/api/v1";
  try {
    const response = await handleRefresh(post("refresh", { cookie: "t" }));
    assert.equal(response.status, 502);
    assert.equal(refreshCookie(response), undefined);
  } finally {
    process.env.NEXT_PUBLIC_API_BASE_URL = original;
  }
});

test("logout: làm mới rồi thu hồi cặp token mới bằng access token mới, luôn xóa cookie và trả 204", async () => {
  const response = await handleLogout(post("logout", { cookie: "refresh+/=1" }));
  assert.equal(response.status, 204);
  assert.equal(refreshCookie(response).maxAge, 0);
  assert.deepEqual(calls.map((call) => call.path), ["/auth/refresh", "/auth/logout"]);
  assert.equal(calls[1].authorization, "Bearer access-2");
  assert.deepEqual(calls[1].body, { refreshToken: "refresh-2" });
});

test("logout: không có cookie hoặc backend từ chối vẫn 204 và xóa cookie", async () => {
  const none = await handleLogout(post("logout"));
  assert.equal(none.status, 204);
  assert.equal(calls.length, 0);

  refreshStatus = 401;
  const rejected = await handleLogout(post("logout", { cookie: "t" }));
  assert.equal(rejected.status, 204);
  assert.equal(refreshCookie(rejected).maxAge, 0);
  assert.deepEqual(calls.map((call) => call.path), ["/auth/refresh"]);
});
