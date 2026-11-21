import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Customer } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";
import { LOCKED_CUSTOMER_MESSAGES } from "../list";

type LockedCustomerTableProps = {
  customers: Customer[];
  onUnlock: (customer: Customer) => void;
};

const headerClass = "px-4 py-3 text-left text-xs font-semibold text-muted";

// MW-09 vùng 2 – Bảng khách bị khóa (UI-Screens.md). Chỉ có tên, số điện thoại, email vì Customer chưa có số lần vắng mặt,
// các lần vắng mặt, thời điểm bị khóa (UI-Screens G-10).
export function LockedCustomerTable({ customers, onUnlock }: LockedCustomerTableProps) {
  if (customers.length === 0) {
    return (
      <Card>
        <EmptyState icon="lock" title={LOCKED_CUSTOMER_MESSAGES.emptyTitle} description={LOCKED_CUSTOMER_MESSAGES.emptyDescription} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">Danh sách khách hàng bị khóa tự đặt lịch</caption>
          <thead className="bg-mist">
            <tr>
              <th scope="col" className={headerClass}>Khách hàng</th>
              <th scope="col" className={headerClass}>Số điện thoại</th>
              <th scope="col" className={headerClass}>Email</th>
              <th scope="col" className={`${headerClass} text-right`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.customerId} className="border-t border-line-soft align-middle">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={customer.fullName} tone="apricot" />
                    <span className="font-semibold">{customer.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 tabular-nums">{formatPhone(customer.phone)}</td>
                <td className="px-4 py-3.5">{customer.email ? customer.email : <span className="text-muted">–</span>}</td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Gỡ khóa tự đặt lịch của ${customer.fullName}`}
                      onClick={() => onUnlock(customer)}
                    >
                      {LOCKED_CUSTOMER_MESSAGES.confirm}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
