import { formatMoney } from "@/lib/format";
import { formatHoldUntil, formatSlotRange } from "../spa-summary";

type SpaInfoGridProps = {
  serviceNames: string[];
  // ISO 8601.
  slotStart: string;
  slotEnd: string;
  bufferMinutes: number;
  // VND do server tính; chỉ hiển thị, không tính lại ở web (Frontend-Conventions mục 11).
  amount: number;
  // Lịch khách đã đổi: nhãn “Số tiền mới” thay cho “Tạm tính” (UI demo MW-04).
  isCustomerChanged: boolean;
};

function InfoCell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-mist px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="break-words font-semibold">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}

// MW-04 vùng 4 cho lịch spa: Dịch vụ, Khung giờ (kèm giờ giữ chỗ), Tạm tính hoặc Số tiền mới. Chỉ hiển thị, không gửi lên API.
export function SpaInfoGrid({ serviceNames, slotStart, slotEnd, bufferMinutes, amount, isCustomerChanged }: SpaInfoGridProps) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2.5 max-[640px]:grid-cols-1">
      <InfoCell label="Dịch vụ" value={serviceNames.join(", ")} />
      <InfoCell label="Khung giờ" value={formatSlotRange(slotStart, slotEnd)} note={formatHoldUntil(slotEnd, bufferMinutes)} />
      <InfoCell label={isCustomerChanged ? "Số tiền mới" : "Tạm tính"} value={formatMoney(amount)} />
    </div>
  );
}
