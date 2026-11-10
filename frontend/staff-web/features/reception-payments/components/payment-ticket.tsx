import { PetAvatar } from "@/components/domain/pet-avatar";
import { getPetName, PAYMENT_KIND_SHORT_LABELS, type CounterPaymentRow } from "@/features/reception-payments/payment";
import type { PaymentKind } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

const STUB_CLASS: Record<PaymentKind, { box: string; amount: string }> = {
  Spa: { box: "bg-lagoon-25", amount: "text-lagoon-700" },
  Stay: { box: "bg-[#F1EFFC]", amount: "text-[#4A3FA6]" },
  LateFee: { box: "bg-apricot-50", amount: "text-apricot-700" },
};

type PaymentTicketProps = {
  row: CounterPaymentRow;
  description: string;
  selected: boolean;
  onSelect: () => void;
};

// Phiếu rút gọn của một khoản cần thu (vùng 1). Cuống: số tiền và loại khoản.
export function PaymentTicket({ row, description, selected, onSelect }: PaymentTicketProps) {
  const { payment } = row;
  const stub = STUB_CLASS[payment.kind];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`grid w-full cursor-pointer grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl border bg-white text-left ${
        selected ? "border-lagoon ring-1 ring-lagoon" : "border-line hover:border-[#B7CDD1]"
      }`}
    >
      <span
        className={`relative flex flex-col items-center justify-center border-r-[1.5px] border-dashed border-line px-2 py-3.5 text-center before:absolute before:-right-2 before:-top-[9px] before:size-[15px] before:rounded-full before:border before:border-line before:bg-white before:content-[''] after:absolute after:-bottom-[9px] after:-right-2 after:size-[15px] after:rounded-full after:border after:border-line after:bg-white after:content-[''] ${stub.box}`}
      >
        <span className={`text-[15px] font-bold leading-5 tabular-nums ${stub.amount}`}>{formatMoney(payment.amount)}</span>
        <span className="mt-0.5 text-xs leading-4 text-muted">{PAYMENT_KIND_SHORT_LABELS[payment.kind]}</span>
      </span>
      <span className="flex min-w-0 items-center gap-3 px-4 py-3">
        <PetAvatar species={row.species} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{getPetName(row)}</span>
          <span className="mt-0.5 block text-[13px] leading-5 text-muted">{description}</span>
        </span>
      </span>
    </button>
  );
}
