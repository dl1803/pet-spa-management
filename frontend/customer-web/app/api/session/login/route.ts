import type { NextRequest } from "next/server";
import type { LoginRequest } from "@/lib/api/types";
import { ALLOWED_ROLE } from "@/lib/auth/config";
import {
  callBackend,
  ENVELOPES,
  envelopeResponse,
  isMe,
  isSameOrigin,
  isTokenPair,
  jsonResponse,
  relayError,
  setRefreshCookie,
} from "@/lib/auth/session-server";
import type { SessionLoginResponse } from "@/lib/auth/types";

function parseLoginRequest(data: unknown): LoginRequest | null {
  if (typeof data !== "object" || data === null) return null;
  const { userName, password } = data as Record<string, unknown>;
  if (typeof userName !== "string" || typeof password !== "string") return null;
  return { userName, password };
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return envelopeResponse(ENVELOPES.forbidden);

  const body: unknown = await request.json().catch(() => null);
  const credentials = parseLoginRequest(body);
  if (credentials === null) return envelopeResponse(ENVELOPES.validation);

  const loginResult = await callBackend(request, "/auth/login", { body: credentials });
  if (loginResult.status !== 200) return relayError(loginResult);
  const tokens = loginResult.body;
  if (!isTokenPair(tokens)) return envelopeResponse(ENVELOPES.badGateway);

  // Thu hồi refresh token vừa cấp khi không thể hoàn tất đăng nhập (best effort, bỏ qua kết quả).
  async function revokeIssuedTokens() {
    if (!isTokenPair(tokens)) return;
    await callBackend(request, "/auth/logout", {
      body: { refreshToken: tokens.refreshToken },
      accessToken: tokens.accessToken,
    });
  }

  const meResult = await callBackend(request, "/me", { method: "GET", accessToken: tokens.accessToken });
  const me = meResult.body;
  if (meResult.status !== 200 || !isMe(me)) {
    await revokeIssuedTokens();
    return meResult.status !== 200 ? relayError(meResult) : envelopeResponse(ENVELOPES.badGateway);
  }

  if (me.role !== ALLOWED_ROLE) {
    await revokeIssuedTokens();
    return envelopeResponse(ENVELOPES.wrongWeb);
  }

  const payload: SessionLoginResponse = { accessToken: tokens.accessToken, me };
  const response = jsonResponse(payload);
  setRefreshCookie(response, request, tokens.refreshToken);
  return response;
}

