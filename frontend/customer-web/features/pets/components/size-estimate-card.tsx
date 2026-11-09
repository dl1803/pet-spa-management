import { Card, CardBody } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { isDog } from "@/features/pets/forms";
import type { Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { formatMeasure, type SizeEstimate } from "@/lib/size-estimate";

type EstimateRowProps = { label: string; value: string; isTotal?: boolean };

function EstimateRow({ label, value, isTotal = false }: EstimateRowProps) {
  return (
    <div
      className={`flex justify-between gap-4 py-[7px] ${isTotal ? "mt-1 border-t border-dashed border-line pt-2.5" : ""}`}
    >
      <span className="text-muted">{label}</span>
      <span className={`text-right ${isTotal ? "font-semibold" : "font-medium"}`}>{value}</span>
    </div>
  );
}

type SizeEstimateCardProps = {
  species: Species;
  estimate: SizeEstimate;
};

// Nhóm kích cỡ dự kiến: chỉ để xem, không gửi lên API;
// nhóm chính thức là `sizeGroup` do backend xác định khi lưu.
export function SizeEstimateCard({ species, estimate }: SizeEstimateCardProps) {
  return (
    <aside className="sticky top-[92px] max-[1180px]:static">
      <Card>
        <CardBody>
          <h3 className="font-medium text-muted">Nhóm kích cỡ dự kiến</h3>
          {estimate.status === "ready" ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[30px] font-bold leading-9">{SIZE_GROUP_LABELS[estimate.group]}</span>
                <Tag tone="size">{SPECIES_LABELS[species]}</Tag>
              </div>
              <div className="mt-3 text-xs">
                <EstimateRow
                  label={`Theo cân nặng ${formatMeasure(estimate.byWeight.value)} kg`}
                  value={estimate.byWeight.rangeLabel}
                />
                {estimate.byHeight && (
                  <>
                    <EstimateRow
                      label={`Theo chiều cao ${formatMeasure(estimate.byHeight.value)} cm`}
                      value={estimate.byHeight.rangeLabel}
                    />
                    <EstimateRow label="Lấy nhóm cao hơn" value={SIZE_GROUP_LABELS[estimate.group]} isTotal />
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-[30px] font-bold leading-9 text-muted">Chưa đủ dữ liệu</div>
              <p className="mt-3 text-xs text-muted">
                {isDog(species)
                  ? "Nhập cân nặng và chiều cao để xem nhóm dự kiến."
                  : "Nhập cân nặng để xem nhóm dự kiến."}
              </p>
            </>
          )}
          <p className="mt-3 text-xs text-muted">
            Nhóm chính thức do hệ thống xác định khi lưu, dùng để tính giá, thời lượng và chọn chuồng.
          </p>
        </CardBody>
      </Card>
    </aside>
  );
}

