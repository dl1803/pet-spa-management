"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { getMe } from "@/lib/api/endpoints/accounts";
import { setAccessTokenProvider, setSessionHandlers } from "@/lib/api/client";
import { ApiError, toApiError } from "@/lib/api/errors";
import type { LoginRequest, Me } from "@/lib/api/types";
import { buildLoginPath } from "./paths";
import { isManagerMe } from "./roles";
import { refreshAccessToken, requestLogin, requestLogout } from "./session-client";

// Access token chỉ nằm trong biến của module này (bộ nhớ trình duyệt), mất khi tải lại trang.
let accessToken: string | null = null;

function storeAccessToken(token: string | null) {
  accessToken = token;
  setAccessTokenProvider(() => accessToken);
}

export type SessionStatus = "idle" | "restoring" | "authenticated" | "failed";

type SessionContextValue = {
  status: SessionStatus;
  me: Me | null;
  // Lỗi tạm khi khôi phục phiên (mất mạng, 429, 5xx); phiên bị từ chối thì đã chuyển về màn đăng nhập.
  error: ApiError | null;
  signIn: (request: LoginRequest) => Promise<Me>;
  restore: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

// Xóa mọi dấu vết phiên rồi tải lại trang đăng nhập: bộ nhớ (token, bộ đệm Query) sạch hoàn toàn.
function leaveSession(options: { expired: boolean }) {
  storeAccessToken(null);
  const next = options.expired ? window.location.pathname + window.location.search : null;
  window.location.replace(buildLoginPath({ next, expired: options.expired }));
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const restoring = useRef(false);
  const signingOut = useRef(false);

  const registerHandlers = useCallback(() => {
    setSessionHandlers({
      refresh: async () => {
        storeAccessToken(await refreshAccessToken());
      },
      onExpired: () => {
        queryClient.clear();
        leaveSession({ expired: true });
      },
    });
  }, [queryClient]);

  const signIn = useCallback(
    async (request: LoginRequest) => {
      const result = await requestLogin(request);
      storeAccessToken(result.accessToken);
      registerHandlers();
      setMe(result.me);
      setError(null);
      setStatus("authenticated");
      return result.me;
    },
    [registerHandlers],
  );

  const restore = useCallback(async () => {
    if (restoring.current) return;
    restoring.current = true;
    setStatus("restoring");
    setError(null);
    registerHandlers();
    let refreshed = false;
    try {
      storeAccessToken(await refreshAccessToken());
      refreshed = true;
      const current = await getMe();
      if (!isManagerMe(current)) throw new ApiError({ kind: "http", status: 403, code: "FORBIDDEN" });
      setMe(current);
      setStatus("authenticated");
    } catch (failure) {
      const apiError = toApiError(failure);
      if (apiError.status === 401 || apiError.status === 403) {
        setSessionHandlers(null);
        storeAccessToken(null);
        // Nếu refreshAccessToken() đã thành công thì cookie vẫn còn trên trình duyệt: phải gọi logout
        // để xóa cookie httpOnly trước khi chuyển về /dang-nhap, tránh vòng lặp redirect với proxy.ts.
        if (refreshed) {
          try {
            await requestLogout();
          } catch (logoutFailure) {
            setError(toApiError(logoutFailure));
            setStatus("failed");
            return;
          }
        }
        queryClient.clear();
        leaveSession({ expired: apiError.status === 401 });
        return;
      }
      setError(apiError);
      setStatus("failed");
    } finally {
      restoring.current = false;
    }
  }, [queryClient, registerHandlers]);

  const signOut = useCallback(async () => {
    if (signingOut.current) return;
    signingOut.current = true;
    setSessionHandlers(null);
    storeAccessToken(null);
    try {
      await requestLogout();
    } catch (failure) {
      // Không xóa được cookie httpOnly khi mất kết nối Next.js: dừng ở trạng thái lỗi thay vì
      // chuyển về /dang-nhap để tránh bị proxy.ts đẩy ngược lại vào ứng dụng.
      setMe(null);
      setError(toApiError(failure));
      setStatus("failed");
      signingOut.current = false;
      return;
    }
    queryClient.clear();
    leaveSession({ expired: false });
  }, [queryClient]);

  const value = useMemo<SessionContextValue>(
    () => ({ status, me, error, signIn, restore, signOut }),
    [status, me, error, signIn, restore, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (value === null) throw new Error("useSession phải nằm trong SessionProvider.");
  return value;
}
