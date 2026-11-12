import { NextResponse, type NextRequest } from "next/server";
import { isErrorEnvelope } from "@/lib/api/errors";
import type { Me, TokenPair } from "@/lib/api/types";
import {
  LOGIN_WRONG_WEB_MESSAGE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  REFRESH_COOKIE_NAME,
} from "./constants";
import { isStaffMe } from "./roles";

// Logic của route handler phiên (Frontend-Architecture 6.2). Chạy ở server của Next.js, gọi backend bằng fetch.

type Envelope = { status: number; code?: string; title: string; detail?: string };

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function errorResponse(envelope: Envelope) {
  return NextResponse.json(envelope, {
    status: envelope.status,
    headers: { ...NO_STORE, "Content-Type": "application/problem+json" },
  });
}

const UNAUTHENTICATED: Envelope = {
  status: 401,
  code: "UNAUTHENTICATED",
  title: "Chưa xác thực",
  detail: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
};

const BAD_GATEWAY: Envelope = {
  status: 502,
  title: "Không kết nối được máy chủ",
  detail: "Có lỗi xảy ra, vui lòng thử lại sau.",
};

// Chỉ nhận yêu cầu cùng origin: trình duyệt luôn gửi Origin cho POST.
export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin === null || host === null) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function getBackendBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return value ? value.replace(/\/+$/, "") : null;
}

type BackendResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; envelope: Envelope };

// Backend giới hạn đăng nhập/làm mới theo IP (10 yêu cầu/phút): chuyển IP của người dùng để họ không dùng chung một giới hạn
// với mọi người cùng đi qua server của Next.js.
function clientIpHeaders(request: NextRequest): Record<string, string> {
  const forwarded = request.headers.get("x-forwarded-for")?.trim();
  return forwarded ? { "X-Forwarded-For": forwarded } : {};
}

async function callBackend<T>(
  request: NextRequest,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; accessToken?: string },
): Promise<BackendResult<T>> {
  const baseUrl = getBackendBaseUrl();
  if (baseUrl === null) {
    return { ok: false, status: 500, envelope: { status: 500, title: "Thiếu cấu hình NEXT_PUBLIC_API_BASE_URL" } };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: init.method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(init.accessToken ? { Authorization: `Bearer ${init.accessToken}` } : {}),
        ...clientIpHeaders(request),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    return { ok: false, status: BAD_GATEWAY.status, envelope: BAD_GATEWAY };
  }

  let data: unknown = null;
  const text = await response.text();
  if (text !== "") {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (response.ok) return { ok: true, data: data as T };

  const envelope = isErrorEnvelope(data)
    ? ({ ...data, status: response.status } as Envelope)
    : { status: response.status, title: "Có lỗi xảy ra", detail: "Có lỗi xảy ra, vui lòng thử lại sau." };
  return { ok: false, status: response.status, envelope };
}

export function setRefreshCookie(request: NextRequest, response: NextResponse, refreshToken: string) {
  const secure = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(REFRESH_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function handleLogin(request: NextRequest) {
  if (!isSameOrigin(request)) return errorResponse({ status: 403, code: "FORBIDDEN", title: "Yêu cầu không hợp lệ" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const { userName, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof userName !== "string" || typeof password !== "string" || userName === "" || password === "") {
    return errorResponse({
      status: 400,
      code: "VALIDATION_ERROR",
      title: "Dữ liệu không hợp lệ",
      detail: "Dữ liệu gửi lên không hợp lệ hoặc sai định dạng.",
    });
  }

  const login = await callBackend<TokenPair>(request, "/auth/login", { method: "POST", body: { userName, password } });
  if (!login.ok) return errorResponse(login.envelope);
  const { accessToken, refreshToken } = login.data;

  const meResult = await callBackend<Me>(request, "/me", { method: "GET", accessToken });
  if (!meResult.ok) {
    // Không để lại refresh token còn hiệu lực khi không xác định được vai trò.
    await callBackend(request, "/auth/logout", { method: "POST", body: { refreshToken }, accessToken });
    return errorResponse(meResult.envelope);
  }

  if (!isStaffMe(meResult.data)) {
    // Auth 3.6: đúng thông tin nhưng không thuộc web này → không lưu phiên, thu hồi refresh token.
    await callBackend(request, "/auth/logout", { method: "POST", body: { refreshToken }, accessToken });
    return errorResponse({ status: 403, code: "FORBIDDEN", title: LOGIN_WRONG_WEB_MESSAGE });
  }

  const response = NextResponse.json({ accessToken, me: meResult.data }, { headers: NO_STORE });
  setRefreshCookie(request, response, refreshToken);
  return response;
}

export async function handleRefresh(request: NextRequest) {
  if (!isSameOrigin(request)) return errorResponse({ status: 403, code: "FORBIDDEN", title: "Yêu cầu không hợp lệ" });

  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return errorResponse(UNAUTHENTICATED);

  const result = await callBackend<TokenPair>(request, "/auth/refresh", { method: "POST", body: { refreshToken } });
  if (!result.ok) {
    // Chỉ xóa cookie khi backend từ chối token. Lỗi tạm (429, 5xx, mất mạng) giữ cookie để thử lại.
    if (result.status === 400 || result.status === 401) {
      const rejected = errorResponse(UNAUTHENTICATED);
      clearRefreshCookie(rejected);
      return rejected;
    }
    return errorResponse(result.envelope);
  }

  const response = NextResponse.json({ accessToken: result.data.accessToken }, { headers: NO_STORE });
  setRefreshCookie(request, response, result.data.refreshToken);
  return response;
}

export async function handleLogout(request: NextRequest) {
  if (!isSameOrigin(request)) return errorResponse({ status: 403, code: "FORBIDDEN", title: "Yêu cầu không hợp lệ" });

  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (refreshToken) {
    // POST /auth/logout cần access token còn hạn. Trình duyệt chỉ giữ refresh token nên làm mới trước rồi thu hồi cặp mới;
    // refresh token cũ đã bị thu hồi khi xoay vòng. Mọi lỗi đều bỏ qua: cookie luôn bị xóa.
    const renewed = await callBackend<TokenPair>(request, "/auth/refresh", { method: "POST", body: { refreshToken } });
    if (renewed.ok) {
      await callBackend(request, "/auth/logout", {
        method: "POST",
        body: { refreshToken: renewed.data.refreshToken },
        accessToken: renewed.data.accessToken,
      });
    }
  }

  const response = new NextResponse(null, { status: 204, headers: NO_STORE });
  clearRefreshCookie(response);
  return response;
}
