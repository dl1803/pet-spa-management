import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import {
  callBackend,
  clearRefreshCookie,
  ENVELOPES,
  envelopeResponse,
  isSameOrigin,
  isTokenPair,
  jsonResponse,
  relayError,
  setRefreshCookie,
} from "@/lib/auth/session-server";
import type { SessionRefreshResponse } from "@/lib/auth/types";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return envelopeResponse(ENVELOPES.forbidden);

  const refreshToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!refreshToken) return envelopeResponse(ENVELOPES.unauthenticated);

  const result = await callBackend(request, "/auth/refresh", { body: { refreshToken } });
  if (result.status === 401) {
    // Refresh token không còn hợp lệ: xóa cookie để không lặp lại chuyển hướng.
    const response = relayError(result);
    clearRefreshCookie(response, request);
    return response;
  }
  // Lỗi tạm thời (429, 5xx, mất mạng): giữ cookie để người dùng thử lại, không đăng xuất oan.
  if (result.status !== 200) return relayError(result);

  const tokens = result.body;
  if (!isTokenPair(tokens)) return envelopeResponse(ENVELOPES.badGateway);

  const payload: SessionRefreshResponse = { accessToken: tokens.accessToken };
  const response = jsonResponse(payload);
  setRefreshCookie(response, request, tokens.refreshToken);
  return response;
}

