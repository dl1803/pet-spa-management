import type { ReactNode } from "react";
import { RoleGate } from "@/lib/auth/role-gate";
import { ServingCustomerProvider } from "@/lib/serving-customer";

// Khách đang phục vụ chỉ cần trong nhóm màn Khách hàng; gắn Provider ở đây để không sửa app/providers.tsx.
// Cả nhóm màn (danh sách, hồ sơ thú cưng) chỉ dành cho Lễ tân.
export default function CustomersLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGate allow={["Receptionist"]}>
      <ServingCustomerProvider>{children}</ServingCustomerProvider>
    </RoleGate>
  );
}
