// MW-02 Tổng quan và giám sát tiến độ – UI-Screens.md. Chỉ xem, không có thao tác ghi.
import { AttentionList } from "@/features/dashboard/components/attention-list";
import { KpiSummary } from "@/features/dashboard/components/kpi-summary";
import { OccupiedCages } from "@/features/dashboard/components/occupied-cages";
import { StaffTimeline } from "@/features/dashboard/components/staff-timeline";
import { buildAttentionItems, describeUpdatedAt, listOccupiedCages, type DashboardSnapshot } from "@/features/dashboard/overview";

export function DashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1>Tổng quan hôm nay</h1>
        <p className="mt-1 text-muted">{describeUpdatedAt(snapshot.now)}</p>
      </header>
      <KpiSummary snapshot={snapshot} />
      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1100px]:grid-cols-1">
        <StaffTimeline snapshot={snapshot} />
        <div className="flex flex-col gap-5">
          <AttentionList items={buildAttentionItems(snapshot)} />
          <OccupiedCages cages={listOccupiedCages(snapshot)} />
        </div>
      </div>
    </div>
  );
}
