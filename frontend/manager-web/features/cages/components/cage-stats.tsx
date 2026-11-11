import { KpiTile } from "@/components/ui/kpi-tile";
import type { Cage } from "@/lib/api/types";
import { summarizeCages } from "../list";

// MW-07 vùng 3 – 4 thẻ số liệu của tab Chuồng (UI-Screens.md). Mọi số là đếm từ danh sách chuồng.
export function CageStats({ cages }: { cages: Cage[] }) {
  const summary = summarizeCages(cages);

  return (
    <section aria-label="Số liệu chuồng" className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
      <KpiTile label="Sức chứa" value={String(summary.capacity)} caption="chuồng đang sử dụng" />
      <KpiTile
        label="Đang chứa"
        value={String(summary.occupied)}
        caption={summary.occupied > 0 ? summary.occupiedCodes.join(", ") : "chưa có chuồng nào"}
      />
      <KpiTile label="Trống" value={String(summary.empty)} caption="sẵn sàng nhận" />
      <KpiTile label="Ngừng sử dụng" value={String(summary.inactive)} caption="không tính vào sức chứa" />
    </section>
  );
}
