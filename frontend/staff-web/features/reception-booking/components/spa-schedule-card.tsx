import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SlotPicker, SlotPickerSkeleton } from "@/features/reception-booking/components/slot-picker";
import {
  addMinutesToTime,
  describeStaffNeed,
  formatDateChip,
  SLOT_FULL_MESSAGE,
} from "@/features/reception-booking/spa-forms";
import type { Pet, SpaSlots } from "@/lib/api/types";

export const SLOT_ERROR_ID = "reception-spa-slot-error";
export const DAY_FULL_MESSAGE = "Ngày này đã kín, vui lòng chọn ngày khác.";
export const NEED_SERVICE_MESSAGE = "Chọn ít nhất một dịch vụ để xem khung giờ còn chỗ.";

type SpaScheduleCardProps = {
  pet: Pet;
  dates: string[];
  date: string;
  onDateChange: (date: string) => void;
  hasServices: boolean;
  slots: SpaSlots | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  slotTime: string;
  onSlotChange: (time: string) => void;
  slotError?: string;
  isSlotFull: boolean;
};

export function SpaScheduleCard({
  pet,
  dates,
  date,
  onDateChange,
  hasServices,
  slots,
  isLoading,
  error,
  onRetry,
  slotTime,
  onSlotChange,
  slotError,
  isSlotFull,
}: SpaScheduleCardProps) {
  return (
    <Card>
      <CardHeader title="Ngày và khung giờ" />
      <CardBody>
        <fieldset className="mb-2">
          <legend className="sr-only">Chọn ngày</legend>
          <div className="flex flex-wrap gap-2">
            {dates.map((dateKey) => {
              const { weekday, day } = formatDateChip(dateKey);
              const isSelected = dateKey === date;
              return (
                <button
                  key={dateKey}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onDateChange(dateKey)}
                  className={`flex min-h-[58px] min-w-[60px] cursor-pointer flex-col items-center justify-center rounded-xl border px-2 py-1.5 ${
                    isSelected ? "border-lagoon bg-lagoon text-white" : "border-line bg-white text-ink hover:border-lagoon"
                  }`}
                >
                  <small className={`text-[11px] leading-[14px] ${isSelected ? "text-lagoon-50" : "text-muted"}`}>{weekday}</small>
                  <b className="text-[15px] leading-5 tabular-nums">{day}</b>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          {!hasServices ? (
            <Alert tone="neutral">{NEED_SERVICE_MESSAGE}</Alert>
          ) : isLoading ? (
            <SlotPickerSkeleton />
          ) : slots === undefined ? (
            <div className="flex flex-col items-start gap-2">
              <ErrorAlert error={error} className="w-full" />
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Thử lại
              </Button>
            </div>
          ) : (
            <>
              {!slots.slots.some((slot) => slot.status === "Available") && <Alert tone="warn">{DAY_FULL_MESSAGE}</Alert>}
              <SlotPicker
                legend="Khung giờ"
                slots={slots.slots}
                value={slotTime}
                onChange={onSlotChange}
                getEndTime={(time) => addMinutesToTime(time, slots.durationMinutes)}
                describedBy={slotError ? SLOT_ERROR_ID : undefined}
              />
              <Alert tone="info">{describeStaffNeed(pet, slots.staffRequired, slots.durationMinutes)}</Alert>
            </>
          )}
          {isSlotFull && (
            <Alert tone="danger" title="Hết chỗ">
              {SLOT_FULL_MESSAGE}
            </Alert>
          )}
        </div>
        <FieldError id={SLOT_ERROR_ID} message={slotError} />
      </CardBody>
    </Card>
  );
}
