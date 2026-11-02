import { formatMoney } from "@/lib/format";
import { formatStayMoment, type StaySummary } from "../stay-summary";

type StayInfoGridProps = {
  plannedCheckIn: string;
  plannedCheckOut: string;
  summary: StaySummary;
};

function InfoCell({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-mist px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-semibold">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}

// MW-04 vùng 4 cho lịch lưu trú: Nhận, Trả (kèm số đêm), Tạm tính (kèm công thức). Chỉ hiển thị, không gửi lên API.
export function StayInfoGrid({ plannedCheckIn, plannedCheckOut, summary }: StayInfoGridProps) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2.5 max-[640px]:grid-cols-1">
      <InfoCell label="Nhận" value={formatStayMoment(plannedCheckIn)} />
      <InfoCell
        label="Trả"
        value={formatStayMoment(plannedCheckOut)}
        note={`${summary.nights} đêm: ${summary.nightDates.join(", ")}`}
      />
      <InfoCell label="Tạm tính" value={formatMoney(summary.total)} note={summary.formula} />
    </div>
  );
}
