import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import {
  callBackend,
  clearRefreshCookie,
  ENVELOPES,
  envelopeResponse,
  isSameOrigin,
  noContentResponse,
} from "@/lib/auth/session-server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return envelopeResponse(ENVELOPES.forbidden);

  const refreshToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  // Backend yêu cầu Bearer access token cho /auth/logout: chuyển tiếp token mà trình duyệt gửi kèm.
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (refreshToken) {
    // Best effort: kể cả backend lỗi, cookie vẫn bị xóa.
    await callBackend(request, "/auth/logout", { body: { refreshToken }, accessToken });
  }

  const response = noContentResponse();
  clearRefreshCookie(response, request);
  return response;
}

