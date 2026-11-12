"use client";

import { useEffect, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "./session-context";

// Lớp 2 của route guard (Frontend-Architecture 4.2): lấy access token và GET /me trước khi hiện màn.
export function SessionGate({ children }: { children: ReactNode }) {
  const { status, error, restore } = useSession();

  useEffect(() => {
    if (status === "idle") void restore();
  }, [status, restore]);

  if (status === "authenticated") return <>{children}</>;

  if (status === "failed") {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <Button onClick={() => void restore()}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Đang tải phiên đăng nhập…</span>
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
