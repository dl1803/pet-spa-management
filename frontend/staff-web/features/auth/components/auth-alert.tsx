import type { ReactNode } from "react";
import { Alert } from "@/components/feedback/alert";

// Lỗi đăng nhập: nền danger, role="alert" (Alert tone="danger" đã có sẵn cả hai).
export function AuthAlert({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Alert tone="danger" className={className}>
      {children}
    </Alert>
  );
}
