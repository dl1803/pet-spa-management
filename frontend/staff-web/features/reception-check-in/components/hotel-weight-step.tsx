import type { UseFormRegisterReturn } from "react-hook-form";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { WeightField } from "@/features/reception-check-in/components/weight-field";
import type { WeightOutcome } from "@/features/reception-check-in/check-in";
import { formatKg, formatWeightDifference } from "@/features/reception-check-in/weight";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

function describeRecorded(outcome: WeightOutcome | null) {
  if (outcome === null) return null;
  const { weightCheck, actualWeightKg, declaredWeightKg } = outcome;
  const parts = [`Khai báo ${formatKg(declaredWeightKg)}.`, `Chênh ${formatWeightDifference(actualWeightKg, declaredWeightKg)}.`];
  if (weightCheck.result === "OK") parts.push("Chi phí không đổi.");
  if (weightCheck.result === "PRICE_DECREASED" && weightCheck.newSizeGroup && weightCheck.oldAmount !== undefined && weightCheck.newAmount !== undefined) {
    parts.push(
      `Xuống nhóm ${SIZE_GROUP_LABELS[weightCheck.newSizeGroup]}. Chi phí giảm từ ${formatMoney(weightCheck.oldAmount)} xuống ${formatMoney(weightCheck.newAmount)}.`,
    );
  }
  return parts.join(" ");
}

type HotelWeightStepProps =
  | { mode: "form"; registration: UseFormRegisterReturn; error?: string; isSubmitting: boolean }
  | { mode: "recorded"; actualWeightKg: number | null; outcome: WeightOutcome | null };

export function HotelWeightStep(props: HotelWeightStepProps) {
  if (props.mode === "form") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-line px-4 py-3.5">
        <div className="font-semibold">Bước 1 – Đối chiếu cân nặng</div>
        <WeightField id="check-in-weight" registration={props.registration} error={props.error} />
        <div>
          <Button type="submit" variant="secondary" loading={props.isSubmitting}>
            Đối chiếu cân nặng
          </Button>
        </div>
      </div>
    );
  }

  const detail = describeRecorded(props.outcome);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#BFE0CA] bg-success-50 px-4 py-3.5">
      <Icon name="check-circle" className="mt-px size-[18px] text-success" />
      <div className="min-w-0 grow">
        <div className="font-semibold">
          {props.actualWeightKg !== null ? `Ghi nhận cân nặng thực tế: ${formatKg(props.actualWeightKg)}` : "Đã ghi nhận cân nặng thực tế"}
        </div>
        {detail && <div className="text-xs text-muted">{detail}</div>}
      </div>
      <Tag tone="ok">Đã đối chiếu</Tag>
    </div>
  );
}

