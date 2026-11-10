import type { ReactNode } from "react";
import { ServingCustomerProvider } from "@/lib/serving-customer";

// Khách đang phục vụ chỉ cần trong nhóm màn Khách hàng; gắn Provider ở đây để không sửa app/providers.tsx.
export default function CustomersLayout({ children }: { children: ReactNode }) {
  return <ServingCustomerProvider>{children}</ServingCustomerProvider>;
}

