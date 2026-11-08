import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/features/reception-booking/forms";
import type { Customer } from "@/lib/api/types";

export function ServingCustomerBar({ customer }: { customer: Customer }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-mist px-4 py-3.5">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-apricot-100 text-sm font-semibold text-apricot-700"
      >
        {getInitials(customer.fullName)}
      </span>
      <div className="min-w-0 grow">
        <div className="font-semibold">{customer.fullName}</div>
        <div className="text-xs text-muted">{customer.phone}</div>
      </div>
      <Button variant="ghost" size="sm" disabled>
        <Icon name="swap" className="size-3.5" />
        Đổi khách
      </Button>
    </div>
  );
}

