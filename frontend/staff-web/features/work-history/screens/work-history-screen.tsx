"use client";

// SW-12 Lịch sử công việc – UI-Screens.md

import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pager } from "@/components/ui/pager";
import { Select } from "@/components/ui/select";
import { WorkHistoryTable } from "@/features/work-history/components/work-history-table";
import {
  WORK_HISTORY_PAGE_SIZE,
  filterByMonth,
  formatMonthLabel,
  listMonthKeys,
  paginate,
  parsePage,
  resolveMonthKey,
  selectWorkHistory,
} from "@/features/work-history/list";
import { MOCK_WORK_HISTORY } from "@/features/work-history/mock-data";
import { ROUTES, withQuery } from "@/lib/routes";

const TITLE = "Lịch sử công việc";
const DESCRIPTION = "Các lịch spa bạn đã thực hiện.";

export function WorkHistoryScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dữ liệu mô phỏng: chưa gọi API (nối API thật ở bước sau).
  const entries = selectWorkHistory(MOCK_WORK_HISTORY);
  const monthKeys = listMonthKeys(entries);
  const monthKey = resolveMonthKey(searchParams.get("month"), monthKeys);
  const monthEntries = filterByMonth(entries, monthKey);
  const { page, items } = paginate(monthEntries, parsePage(searchParams.get("page")), WORK_HISTORY_PAGE_SIZE);

  if (monthKey === null) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <Card>
          <EmptyState
            icon="history"
            title="Chưa có lịch sử công việc"
            description="Các lịch spa bạn đã hoàn tất sẽ hiện ở đây."
          />
        </Card>
      </>
    );
  }

  const monthLabel = formatMonthLabel(monthKey);

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION}>
        <div className="w-[180px] max-[640px]:w-full">
          <Select
            aria-label="Chọn tháng"
            value={monthKey}
            onChange={(event) =>
              router.replace(withQuery(ROUTES.workHistory, { month: event.target.value }), { scroll: false })
            }
          >
            {monthKeys.map((key) => (
              <option key={key} value={key}>
                {formatMonthLabel(key)}
              </option>
            ))}
          </Select>
        </div>
      </PageHeader>

      <Card>
        <WorkHistoryTable entries={items} />
        <p className="border-t border-line-soft px-5 py-3.5 text-[13px] text-muted">
          {monthEntries.length} lịch trong {monthLabel.toLocaleLowerCase("vi-VN")}
        </p>
      </Card>
      <Pager
        page={page}
        pageSize={WORK_HISTORY_PAGE_SIZE}
        total={monthEntries.length}
        onPageChange={(next) => router.replace(withQuery(ROUTES.workHistory, { month: monthKey, page: next }), { scroll: false })}
      />
    </>
  );
}
