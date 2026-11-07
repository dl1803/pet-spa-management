import { FilterChip } from "@/components/ui/filter-chip";
import { Select } from "@/components/ui/input";
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import {
  PAYMENT_KIND_ORDER,
  PAYMENT_METHOD_ORDER,
  parsePaymentKindFilter,
  parsePaymentMethodFilter,
  type PaymentKindFilter,
  type PaymentMethodFilter,
  type PaymentStatusFilter,
} from "../list";

type PaymentFiltersProps = {
  status: PaymentStatusFilter;
  kind: PaymentKindFilter;
  method: PaymentMethodFilter;
  unpaidCount: number;
  onStatusChange: (status: PaymentStatusFilter) => void;
  onKindChange: (kind: PaymentKindFilter) => void;
  onMethodChange: (method: PaymentMethodFilter) => void;
};

// MW-10 vùng 2 – Bộ lọc (UI-Screens.md). Trạng thái lọc ở server (`status`); khoản và phương thức lọc ở web (G-07).
export function PaymentFilters({
  status,
  kind,
  method,
  unpaidCount,
  onStatusChange,
  onKindChange,
  onMethodChange,
}: PaymentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-4 py-3.5">
      <div role="group" aria-label="Lọc theo trạng thái thanh toán" className="flex flex-wrap gap-2">
        <FilterChip active={status === "all"} onClick={() => onStatusChange("all")}>Tất cả</FilterChip>
        <FilterChip active={status === "Unpaid"} count={unpaidCount} onClick={() => onStatusChange("Unpaid")}>
          Chưa thanh toán
        </FilterChip>
        <FilterChip active={status === "Paid"} onClick={() => onStatusChange("Paid")}>Đã thanh toán</FilterChip>
      </div>
      <div className="w-[170px] max-[640px]:w-full">
        <Select
          aria-label="Lọc theo khoản"
          value={kind}
          onChange={(event) => onKindChange(parsePaymentKindFilter(event.target.value))}
        >
          <option value="all">Mọi khoản</option>
          {PAYMENT_KIND_ORDER.map((item) => (
            <option key={item} value={item}>{PAYMENT_KIND_LABELS[item]}</option>
          ))}
        </Select>
      </div>
      <div className="w-[190px] max-[640px]:w-full">
        <Select
          aria-label="Lọc theo phương thức"
          value={method}
          onChange={(event) => onMethodChange(parsePaymentMethodFilter(event.target.value))}
        >
          <option value="all">Mọi phương thức</option>
          {PAYMENT_METHOD_ORDER.map((item) => (
            <option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
