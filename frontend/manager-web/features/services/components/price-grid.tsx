import type { UseFormRegister } from "react-hook-form";
import { Input, Select } from "@/components/ui/input";
import type { Species } from "@/lib/api/types";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import { PRICING_SLOTS, type PricingProblem, type ServiceFormValues } from "../forms";

type PriceGridProps = {
  species: Species;
  register: UseFormRegister<ServiceFormValues>;
  problems: PricingProblem[];
};

const headerClass = "px-3 py-2.5 text-left text-xs font-semibold text-muted";

// Bảng nhập giá, thời lượng, số nhân viên theo nhóm kích cỡ của một loài (MW-06·D1; Design-System `PriceGrid`).
export function PriceGrid({ species, register, problems }: PriceGridProps) {
  const speciesLabel = SPECIES_LABELS[species];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse">
        <caption className="sr-only">Giá, thời lượng và số nhân viên của {speciesLabel}</caption>
        <thead className="bg-mist">
          <tr>
            <th scope="col" className={headerClass}>Nhóm</th>
            <th scope="col" className={headerClass}>Giá</th>
            <th scope="col" className={headerClass}>Thời lượng</th>
            <th scope="col" className={headerClass}>Số nhân viên</th>
          </tr>
        </thead>
        <tbody>
          {PRICING_SLOTS.map((slot, index) => {
            if (slot.species !== species) return null;
            const group = SIZE_GROUP_LABELS[slot.sizeGroup];
            const isInvalid = problems.some((problem) => problem.species === species && problem.sizeGroup === slot.sizeGroup);
            return (
              <tr key={slot.sizeGroup} className="border-t border-line-soft">
                <th scope="row" className="px-3 py-2 text-left font-semibold">{group}</th>
                <td className="px-3 py-2">
                  <Input
                    suffix="đ"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`Giá (đ), nhóm ${group} của ${speciesLabel}`}
                    aria-invalid={isInvalid || undefined}
                    {...register(`rows.${index}.price`)}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    suffix="phút"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`Thời lượng (phút), nhóm ${group} của ${speciesLabel}`}
                    aria-invalid={isInvalid || undefined}
                    {...register(`rows.${index}.durationMinutes`)}
                  />
                </td>
                <td className="px-3 py-2">
                  <Select aria-label={`Số nhân viên, nhóm ${group} của ${speciesLabel}`} {...register(`rows.${index}.staffRequired`)}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </Select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
