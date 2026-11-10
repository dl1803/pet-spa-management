import type { BreakdownLine } from "@/features/reception-payments/payment";

// Vùng 3: cách tính, chỉ để giải thích. Số tiền thu là số tiền do hệ thống tính ở vùng 4.
export function PaymentBreakdown({ lines }: { lines: BreakdownLine[] }) {
  if (lines.length === 0) return null;
  return (
    <dl className="flex flex-col gap-3 rounded-xl bg-mist px-4 py-3.5 text-sm">
      {lines.map((line, index) => (
        <div key={`${index}-${line.label}`} className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">{line.label}</dt>
          <dd className="text-right font-semibold">{line.value}</dd>
        </div>
      ))}
    </dl>
  );
}
