"use client";

import { useState } from "react";
import { PetGlyph } from "@/components/domain/pet-avatar";
import { ServiceCatalogTable } from "@/components/domain/service-catalog-table";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import type { Species } from "@/lib/api/types";
import { SPECIES_LABELS } from "@/lib/labels";
import { useServices } from "@/lib/queries/services";

const CATALOG_SPECIES = ["Dog", "Cat", "Rabbit", "GuineaPig"] as const satisfies readonly Species[];
const TITLE_ID = "service-catalog-title";

function CatalogSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Đang tải danh mục dịch vụ…</span>
      <Card>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="border-b border-line-soft px-4 py-3.5 last:border-b-0">
            <Skeleton className="h-5 w-40 rounded-[10px]" />
            <Skeleton className="mt-2 h-4 w-64 max-w-full rounded-[10px]" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ServiceCatalogSection() {
  const [species, setSpecies] = useState<Species>("Dog");
  const { data, error, isFetching, refetch } = useServices();

  // Gọi GET /services một lần rồi lọc theo loài ở web để đổi loài không phải tải lại
  // (API có tham số `species` nhưng không dùng ở đây).
  const services = data?.filter((service) => service.pricing.some((row) => row.species === species));

  function handleSpeciesChange(value: string) {
    const next = CATALOG_SPECIES.find((item) => item === value);
    if (next !== undefined) setSpecies(next);
  }

  function renderBody() {
    if (services === undefined) {
      if (error === null) return <CatalogSkeleton />;
      return (
        <div>
          <ErrorAlert error={error} />
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              Thử lại
            </Button>
          </div>
        </div>
      );
    }
    if (services.length === 0) {
      return (
        <Card>
          <p className="px-5 py-10 text-center text-muted">Chưa có dịch vụ cho loài này.</p>
        </Card>
      );
    }
    return (
      <>
        <ServiceCatalogTable services={services} species={species} />
        <p className="mt-2 text-xs text-muted">
          Giá tính theo nhóm kích cỡ của bé. Hệ thống xác định nhóm từ cân nặng (với chó: thêm chiều cao vai, lấy nhóm
          cao hơn) và đối chiếu lại khi cân tại cửa hàng.
        </p>
      </>
    );
  }

  return (
    <section aria-labelledby={TITLE_ID}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={TITLE_ID}>Danh mục dịch vụ spa</h2>
        <SegmentedControl
          label="Chọn loài"
          items={CATALOG_SPECIES.map((item) => ({
            value: item,
            label: (
              <>
                <PetGlyph species={item} className="size-5" />
                {SPECIES_LABELS[item]}
              </>
            ),
          }))}
          value={species}
          onChange={handleSpeciesChange}
        />
      </div>
      {renderBody()}
    </section>
  );
}
