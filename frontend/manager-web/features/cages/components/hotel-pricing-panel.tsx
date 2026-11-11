"use client";

import { useId } from "react";
import type { UseFormRegister } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SIZE_GROUP_LABELS, SPECIES_LABELS } from "@/lib/labels";
import {
  PRICING_SLOTS,
  SPECIES_SIZE_GROUPS,
  validateLateFee,
  type HotelPricingFormValues,
  type PricingProblem,
} from "../forms";

type HotelPricingPanelProps = {
  register: UseFormRegister<HotelPricingFormValues>;
  // Kết quả findPricingProblems của các dòng giá đang nhập; có lỗi thì hiện thông báo đầu khối và đánh dấu các ô lỗi.
  problems: PricingProblem[];
  // Lỗi của ô “Mức phí mỗi lần” do form báo.
  lateFeeError?: string;
};

const headerClass = "px-3 py-2.5 text-left text-xs font-semibold text-muted";

// MW-07 tab Giá – vùng 5 (bảng giá theo loài và nhóm kích cỡ), vùng 6 (phí trả muộn) và ghi chú (UI-Screens.md).
// Đặt trong <form>; nút “Lưu bảng giá” ở đầu trang gắn với form qua thuộc tính `form`.
export function HotelPricingPanel({ register, problems, lateFeeError }: HotelPricingPanelProps) {
  const id = useId();
  const lateFeeId = `${id}-late-fee`;

  return (
    <div className="flex flex-col gap-5">
      {problems.length > 0 && <Alert tone="danger">{problems[0].message}</Alert>}

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[980px]:grid-cols-1">
        <Card>
          <CardHeader title="Giá mỗi đêm theo loài và nhóm kích cỡ" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <caption className="sr-only">Giá chỗ ở và giá thức ăn mỗi đêm theo loài và nhóm kích cỡ</caption>
              <thead className="bg-mist">
                <tr>
                  <th scope="col" className={`${headerClass} pl-5`}>Loài</th>
                  <th scope="col" className={headerClass}>Nhóm</th>
                  <th scope="col" className={headerClass}>Chỗ ở / đêm</th>
                  <th scope="col" className={headerClass}>Thức ăn / đêm</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_SLOTS.map((slot, index) => {
                  const species = SPECIES_LABELS[slot.species];
                  const group = SIZE_GROUP_LABELS[slot.sizeGroup];
                  const groups = SPECIES_SIZE_GROUPS[slot.species];
                  const isFirstOfSpecies = groups[0] === slot.sizeGroup;
                  const isInvalid = problems.some((problem) => problem.species === slot.species && problem.sizeGroup === slot.sizeGroup);
                  return (
                    <tr key={`${slot.species}-${slot.sizeGroup}`} className={isFirstOfSpecies ? "border-t border-line-soft" : ""}>
                      {isFirstOfSpecies && (
                        <th scope="row" rowSpan={groups.length} className="py-2 pl-5 pr-3 text-left align-top font-semibold">
                          <span className="inline-block pt-2.5">{species}</span>
                        </th>
                      )}
                      <th scope="row" className="px-3 py-1.5 text-left font-medium">{group}</th>
                      <td className="px-3 py-1.5">
                        <Input
                          suffix="đ"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={`Chỗ ở mỗi đêm (đ), nhóm ${group} của ${species}`}
                          aria-invalid={isInvalid || undefined}
                          {...register(`rows.${index}.pricePerNight`)}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          suffix="đ"
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label={`Thức ăn mỗi đêm (đ), nhóm ${group} của ${species}`}
                          aria-invalid={isInvalid || undefined}
                          {...register(`rows.${index}.foodPerNight`)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody>
              <h2>Phí trả muộn</h2>
              <Field id={lateFeeId} label="Mức phí mỗi lần" required error={lateFeeError} className="mt-4">
                <Input
                  id={lateFeeId}
                  suffix="đ"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={lateFeeError ? true : undefined}
                  aria-describedby={describedBy(lateFeeId, { hasError: Boolean(lateFeeError) })}
                  {...register("lateFeePerBlock", { validate: validateLateFee })}
                />
              </Field>
              <p className="mt-3 text-xs text-muted">
                Miễn phí 30 phút đầu sau giờ trả dự kiến. Từ phút thứ 31, mỗi 60 phút tính 1 lần. Hai mốc thời gian này đổi tại Cấu hình.
              </p>
            </CardBody>
          </Card>

          <Alert tone="info">Giá mới áp dụng cho lịch lưu trú tạo sau khi lưu. Tiền lưu trú = số đêm × (chỗ ở + thức ăn).</Alert>
        </div>
      </div>
    </div>
  );
}
