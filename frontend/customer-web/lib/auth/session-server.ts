import { NextResponse, type NextRequest } from "next/server";
import { ERROR_MESSAGES, isErrorEnvelope, type ErrorEnvelope } from "@/lib/api/errors";
import type { Me, TokenPair } from "@/lib/api/types";
import { ROLES, SESSION_COOKIE_MAX_AGE_SECONDS, SESSION_COOKIE_NAME, WRONG_WEB_TITLE } from "./config";

// Các error envelope do route handler tự tạo, cùng dạng với envelope của backend (Frontend-Conventions mục 5).
export const ENVELOPES = {
  forbidden: {
    status: 403,
    code: "FORBIDDEN",
    title: "Không có quyền truy cập",
    detail: "Bạn không có quyền thực hiện thao tác này.",
  },
  wrongWeb: { status: 403, code: "FORBIDDEN", title: WRONG_WEB_TITLE, detail: WRONG_WEB_TITLE },
  validation: {
    status: 400,
    code: "VALIDATION_ERROR",
    title: "Dữ liệu không hợp lệ",
    detail: "Dữ liệu gửi lên không hợp lệ hoặc sai định dạng.",
  },
  unauthenticated: {
    status: 401,
    code: "UNAUTHENTICATED",
    title: "Chưa xác thực",
    detail: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
  },
  badGateway: { status: 502, title: "Không kết nối được máy chủ", detail: ERROR_MESSAGES.network },
  server: { status: 500, title: "Lỗi hệ thống", detail: ERROR_MESSAGES.server },
} satisfies Record<string, ErrorEnvelope>;

const NO_STORE = { "Cache-Control": "no-store" };

export function envelopeResponse(envelope: ErrorEnvelope) {
  return NextResponse.json(envelope, { status: envelope.status, headers: NO_STORE });
}

export function jsonResponse(body: unknown) {
  return NextResponse.json(body, { status: 200, headers: NO_STORE });
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204, headers: NO_STORE });
}

// Chỉ nhận yêu cầu cùng origin (trình duyệt luôn gửi Origin với POST). Chặn gọi chéo trang.
export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
}

export type BackendResult = { status: number; body: unknown };

function parseJson(text: string): unknown {
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// Gọi backend từ máy chủ Next.js. Không bao giờ throw: lỗi mạng/cấu hình trả về dưới dạng kết quả.
export async function callBackend(
  request: NextRequest,
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; accessToken?: string | null } = {},
): Promise<BackendResult> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return { status: 500, body: ENVELOPES.server };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Backend giới hạn tốc độ theo IP và đọc IP từ X-Forwarded-For: chuyển tiếp IP của người dùng thật.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "POST",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
    return { status: response.status, body: parseJson(await response.text()) };
  } catch {
    return { status: 502, body: ENVELOPES.badGateway };
  }
}

// Chuyển tiếp lỗi của backend về trình duyệt nguyên mã HTTP; thiếu envelope thì dùng envelope chung.
export function relayError(result: BackendResult) {
  const body: ErrorEnvelope = isErrorEnvelope(result.body)
    ? result.body
    : {
        status: result.status,
        title: result.status >= 500 ? "Lỗi hệ thống" : "Yêu cầu không thành công",
        detail: result.status >= 500 ? ERROR_MESSAGES.server : undefined,
      };
  return NextResponse.json(body, { status: result.status, headers: NO_STORE });
}

export function isTokenPair(data: unknown): data is TokenPair {
  if (typeof data !== "object" || data === null) return false;
  const value = data as Record<string, unknown>;
  return typeof value.accessToken === "string" && typeof value.refreshToken === "string";
}

export function isMe(data: unknown): data is Me {
  if (typeof data !== "object" || data === null) return false;
  const value = data as Record<string, unknown>;
  return (
    typeof value.userId === "string" &&
    typeof value.userName === "string" &&
    typeof value.role === "string" &&
    ROLES.includes(value.role)
  );
}

// Secure trừ khi chạy http://localhost (theo Frontend-Architecture 6.2).
function cookieOptions(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure: request.nextUrl.hostname !== "localhost",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setRefreshCookie(response: NextResponse, request: NextRequest, refreshToken: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: refreshToken,
    ...cookieOptions(request, SESSION_COOKIE_MAX_AGE_SECONDS),
  });
}

export function clearRefreshCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set({ name: SESSION_COOKIE_NAME, value: "", ...cookieOptions(request, 0) });
}

