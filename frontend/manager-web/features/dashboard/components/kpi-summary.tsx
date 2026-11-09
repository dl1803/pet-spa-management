// features/dashboard/components/kpi-summary.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { KpiTile } from "@/components/ui/kpi-tile";
import { summarizeKpis, type DashboardSnapshot } from "@/features/dashboard/overview";
import { formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

// Thẻ chỉ thành liên kết khi trang đích đã có: Chờ xác nhận → MW-04, Khoản chưa thanh toán → MW-10.
// Lịch spa hôm nay (MW-03) và Chuồng đang chứa (MW-07) chưa có trang nên để là thẻ thường.
function TileLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lagoon">
      {children}
    </Link>
  );
}

// MW-02 vùng 2 – 4 thẻ số liệu (UI-Screens.md). Thẻ Chờ xác nhận có nền Apricot khi còn lịch cần xử lý.
export function KpiSummary({ snapshot }: { snapshot: DashboardSnapshot }) {
  const kpis = summarizeKpis(snapshot);

  return (
    <section aria-label="Số liệu hôm nay" className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
      <TileLink href={ROUTES.pending} label={`Chờ xác nhận: ${kpis.pending.total}. Mở danh sách chờ xác nhận`}>
        <KpiTile icon="clipboard" label="Chờ xác nhận" value={String(kpis.pending.total)} caption={kpis.pending.caption} accent={kpis.pending.total > 0} />
      </TileLink>
      <KpiTile icon="droplet" label="Lịch spa hôm nay" value={String(kpis.spaToday.total)} caption={kpis.spaToday.caption} />
      <KpiTile icon="grid" label="Chuồng đang chứa" value={`${kpis.cages.occupied} / ${kpis.cages.active}`} caption={kpis.cages.caption} />
      <TileLink href={ROUTES.payments} label={`Khoản chưa thanh toán: ${kpis.unpaid.count}, ${formatMoney(kpis.unpaid.total)}. Mở trang thanh toán`}>
        <KpiTile icon="wallet" label="Khoản chưa thanh toán" value={String(kpis.unpaid.count)} caption={kpis.unpaid.caption} />
      </TileLink>
    </section>
  );
}
