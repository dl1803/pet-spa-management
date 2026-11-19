"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CageCard } from "@/features/reception-cages/components/cage-card";
import { CageFiltersBar } from "@/features/reception-cages/components/cage-filters";
import {
  CAGES_QUERY_KEY,
  countCages,
  DEFAULT_CAGE_FILTERS,
  describeCageCounts,
  filterCages,
  findReturnAppointmentId,
  isReturnToday,
  type CageFilters,
} from "@/features/reception-cages/cages";
import { mockListCages, mockListInStayRefs } from "@/features/reception-cages/mock-api";
import { isForbiddenError } from "@/lib/api/errors";
import { ROUTES, withQuery } from "@/lib/routes";
import { getStoreDateKey } from "@/lib/time";

const TITLE = "Tình trạng chuồng";
const LOADING_TEXT = "Đang tải tình trạng chuồng…";

export function CagesScreen() {
  const [todayKey] = useState(() => getStoreDateKey(new Date()));
  const [filters, setFilters] = useState<CageFilters>(DEFAULT_CAGE_FILTERS);
  const cagesQuery = useQuery({ queryKey: CAGES_QUERY_KEY, queryFn: mockListCages });
  const cages = cagesQuery.data;
  const inStayQuery = useQuery({
    queryKey: [...CAGES_QUERY_KEY, "in-stay"],
    queryFn: mockListInStayRefs,
  });

  if (cages === undefined) {
    if (cagesQuery.isError) {
      if (isForbiddenError(cagesQuery.error)) {
        return (
          <>
            <PageHeader title={TITLE} description="Bạn không có quyền xem tình trạng chuồng." />
            <ForbiddenState />
          </>
        );
      }
      return (
        <>
          <PageHeader title={TITLE} description="Không tải được tình trạng chuồng." />
          <div className="flex flex-col items-start gap-3">
            <ErrorAlert error={cagesQuery.error} className="w-full" />
            <Button variant="secondary" onClick={() => void cagesQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        </>
      );
    }
    return (
      <>
        <PageHeader title={TITLE} description={LOADING_TEXT} />
        <div role="status" aria-busy="true">
          <span className="sr-only">{LOADING_TEXT}</span>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-[168px] rounded-2xl" />
            ))}
          </div>
        </div>
      </>
    );
  }

  const visibleCages = filterCages(cages, filters);
  const inStayRefs = inStayQuery.data ?? [];

  return (
    <>
      <PageHeader title={TITLE} description={describeCageCounts(countCages(cages))} />
      <CageFiltersBar filters={filters} onChange={setFilters} />
      {visibleCages.length === 0 ? (
        <Card>
          <EmptyState icon="grid" title="Không có chuồng phù hợp" description="Thử đổi bộ lọc loài, nhóm kích cỡ hoặc tình trạng." />
        </Card>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
          {visibleCages.map((cage) => (
            <CageCard
              key={cage.cageId}
              cage={cage}
              returnHref={
                isReturnToday(cage, todayKey)
                  ? withQuery(ROUTES.checkOut, { appointmentId: findReturnAppointmentId(cage, inStayRefs) })
                  : null
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}
