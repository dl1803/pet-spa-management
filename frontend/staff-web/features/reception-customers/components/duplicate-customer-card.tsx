import { Button } from "@/components/ui/button";
import { getInitials } from "@/features/reception-customers/forms";
import type { Customer } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";

type DuplicateCustomerCardProps = {
  customer: Customer;
  onSelect: () => void;
};

// SW-04 vùng 4: khách đã có cùng thông tin liên hệ (409 DUPLICATE_CONTACT); lễ tân chọn khách này thay vì tạo trùng.
export function DuplicateCustomerCard({ customer, onSelect }: DuplicateCustomerCardProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-mist px-4 py-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-apricot-100 font-bold text-apricot-700"
      >
        {getInitials(customer.fullName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{customer.fullName}</div>
        <div className="text-xs text-muted tabular-nums">{formatPhone(customer.phone)}</div>
      </div>
      <Button variant="secondary" size="sm" onClick={onSelect}>
        Chọn khách này
      </Button>
    </div>
  );
}

