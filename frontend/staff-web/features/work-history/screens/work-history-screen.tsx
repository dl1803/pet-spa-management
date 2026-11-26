"use client";

// SW-12 Lịch sử công việc – UI-Screens.md

import { useRouter, useSearchParams } from "next/navigation";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pager } from "@/components/ui/pager";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useWorkHistoryAppointments, useWorkHistoryEntries } from "@/features/work-history/use-work-history";
import { isForbiddenError } from "@/lib/api/errors";
import type { Appointment } from "@/lib/api/types";
import { ROUTES, withQuery } from "@/lib/routes";

const TITLE = "Lịch sử công việc";
const DESCRIPTION = "Các lịch spa bạn đã thực hiện.";
const NO_APPOINTMENTS: Appointment[] = [];

export function WorkHistoryScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useWorkHistoryAppointments();

  // Danh sách theo API: chỉ lịch spa Hoàn tất, mới nhất trước; tháng và trang lọc ở web (UI-Screens G-06).
  const items = selectWorkHistory((query.data ?? NO_APPOINTMENTS).map((appointment) => ({ appointment })));
  const monthKeys = listMonthKeys(items);
  const monthKey = resolveMonthKey(searchParams.get("month"), monthKeys);
  const monthItems = filterByMonth(items, monthKey);
  const { page, items: pageItems } = paginate(monthItems, parsePage(searchParams.get("page")), WORK_HISTORY_PAGE_SIZE);
  // Dịch vụ và loài của các dòng trong trang hiện tại.
  const entries = useWorkHistoryEntries(pageItems.map((item) => item.appointment));

  if (query.data === undefined) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        {query.isError ? (
          isForbiddenError(query.error) ? (
            <ForbiddenState />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <ErrorAlert error={query.error} className="w-full" />
              <Button variant="secondary" onClick={() => void query.refetch()}>
                Thử lại
              </Button>
            </div>
          )
        ) : (
          <div role="status" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">Đang tải lịch sử công việc…</span>
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        )}
      </>
    );
  }

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

      {query.isError && <ErrorAlert error={query.error} className="mb-4" />}
      <Card>
        <WorkHistoryTable entries={entries} />
        <p className="border-t border-line-soft px-5 py-3.5 text-[13px] text-muted">
          {monthItems.length} lịch trong {monthLabel.toLocaleLowerCase("vi-VN")}
        </p>
      </Card>
      <Pager
        page={page}
        pageSize={WORK_HISTORY_PAGE_SIZE}
        total={monthItems.length}
        onPageChange={(next) => router.replace(withQuery(ROUTES.workHistory, { month: monthKey, page: next }), { scroll: false })}
      />
    </>
  );
}
