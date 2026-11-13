"use client";

import { useEffect, type ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { useSession } from "./session-context";

// Lớp 2 của route guard (Frontend-Architecture 4.2): lấy access token và GET /me trước khi hiện màn;
// role không phải Manager thì SessionProvider đã đăng xuất và chuyển về /dang-nhap.
export function SessionGate({ children }: { children: ReactNode }) {
  const { status, error, restore, signOut } = useSession();

  useEffect(() => {
    if (status === "idle") void restore();
  }, [status, restore]);

  if (status === "authenticated") return <>{children}</>;

  if (status === "failed") {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} className="w-full" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void restore()}>Thử lại</Button>
          <Button variant="secondary" onClick={() => void signOut()}>
            Đăng xuất
          </Button>
        </div>
      </div>
    );
  }

  // Khung chờ dạng chữ như các màn khác của web quản lý (xem StaffScreenFallback).
  return (
    <p role="status" aria-busy="true" className="text-muted">
      Đang tải phiên đăng nhập…
    </p>
  );
}
