"use client";

import { useEffect, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/errors";
import { useMe } from "@/lib/queries/me";
import { expireSession } from "./session";

function SessionSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">Đang kiểm tra phiên đăng nhập…</span>
      <Skeleton className="h-8 w-60 rounded-[10px]" />
      <Skeleton className="h-40 rounded-[10px]" />
    </div>
  );
}

// Chỉ hiện nội dung khi đã có phiên hợp lệ (GET /me thành công). Lần đầu tải trang sẽ làm mới bằng cookie.
export function SessionGate({ children }: { children: ReactNode }) {
  const { data, error, isFetching, refetch } = useMe();
  const isUnauthenticated = error !== null && toApiError(error).status === 401;

  useEffect(() => {
    if (isUnauthenticated) void expireSession();
  }, [isUnauthenticated]);

  if (data !== undefined) return <>{children}</>;

  if (error !== null && !isUnauthenticated) {
    return (
      <div>
        <ErrorAlert error={error} />
        <div className="mt-4">
          <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return <SessionSkeleton />;
}

