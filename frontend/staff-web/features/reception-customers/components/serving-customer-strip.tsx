import { Icon } from "@/components/icons";
import type { ServingCustomer } from "@/lib/serving-customer";
import { formatPhone } from "@/lib/format";

// SW-05 vùng 1: khách đang phục vụ. Chưa hiện thẻ “Có tài khoản”/“Khách vãng lai” (UI-Screens G-05).
export function ServingCustomerStrip({ customer }: { customer: ServingCustomer }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-mist px-4 py-3">
      <Icon name="user" className="size-[18px] text-muted" />
      <span>
        <strong>{customer.fullName}</strong>, <span className="tabular-nums">{formatPhone(customer.phone)}</span>
      </span>
    </div>
  );
}

