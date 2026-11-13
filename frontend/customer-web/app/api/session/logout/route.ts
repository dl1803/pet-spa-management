import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import {
  callBackend,
  clearRefreshCookie,
  ENVELOPES,
  envelopeResponse,
  isSameOrigin,
  isTokenPair,
  noContentResponse,
} from "@/lib/auth/session-server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return envelopeResponse(ENVELOPES.forbidden);

  const refreshToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (refreshToken) {
    const renewed = await callBackend(request, "/auth/refresh", { body: { refreshToken } });
    if (renewed.status === 200 && isTokenPair(renewed.body)) {
      await callBackend(request, "/auth/logout", {
        body: { refreshToken: renewed.body.refreshToken },
        accessToken: renewed.body.accessToken,
      });
    }
  }

  const response = noContentResponse();
  clearRefreshCookie(response, request);
  return response;
}

