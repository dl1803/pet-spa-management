import { DateStrip } from "@/components/domain/date-strip";
import { SlotPicker, SlotPickerSkeleton } from "@/components/domain/slot-picker";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { FieldError } from "@/components/feedback/field-error";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { addMinutesToTime, formatDuration } from "@/features/booking/forms";
import type { SpaSlots } from "@/lib/api/types";
import { formatShortDate, formatWeekday } from "@/lib/format";

const SLOT_ERROR_ID = "spa-booking-slot-error";

type SpaBookingSlotStepProps = {
  dates: readonly string[];
  date: string;
  onDateChange: (date: string) => void;
  slotTime: string;
  onSlotChange: (time: string) => void;
  /** Kết quả GET /spa/slots; chưa có khi đang tải. */
  slots: SpaSlots | undefined;
  loadError: unknown;
  isRetrying: boolean;
  onRetry: () => void;
  /** Lỗi dưới lưới mốc giờ (chưa chọn mốc). */
  slotError?: string;
  /** Mốc giờ có thời điểm bắt đầu muộn nhất sớm nhất trong các dịch vụ đã chọn. */
  latestStart: { name: string; time: string } | null;
};

export function SpaBookingSlotStep({
  dates,
  date,
  onDateChange,
  slotTime,
  onSlotChange,
  slots,
  loadError,
  isRetrying,
  onRetry,
  slotError,
  latestStart,
}: SpaBookingSlotStepProps) {
  const hasAvailableSlot = slots?.slots.some((slot) => slot.status === "Available") ?? false;

  return (
    <>
      <Card>
        <CardHeader title="Chọn ngày" />
        <CardBody>
          <DateStrip label="Chọn ngày" dates={dates} value={date} onChange={onDateChange} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Chọn khung giờ, ${formatWeekday(date)} ${formatShortDate(date)}`} />
        <CardBody>
          {loadError ? (
            <div>
              <ErrorAlert error={loadError} />
              <div className="mt-4">
                <Button variant="secondary" onClick={onRetry} disabled={isRetrying}>
                  Thử lại
                </Button>
              </div>
            </div>
          ) : slots === undefined ? (
            <SlotPickerSkeleton />
          ) : (
            <>
              {!hasAvailableSlot && <p className="mb-3 text-muted">Ngày này đã kín, vui lòng chọn ngày khác.</p>}
              <SlotPicker
                legend="Khung giờ"
                slots={slots.slots}
                value={slotTime}
                onChange={onSlotChange}
                getEndTime={(time) => addMinutesToTime(time, slots.durationMinutes)}
                describedBy={slotError ? SLOT_ERROR_ID : undefined}
              />
              <FieldError id={SLOT_ERROR_ID} message={slotError} />
              <Alert tone="info" className="mt-4">
                {`Lịch này cần ${slots.staffRequired} nhân viên trong ${formatDuration(slots.durationMinutes)}. Cửa hàng sẽ xếp nhân viên khi xác nhận, bạn không cần chọn.${
                  latestStart ? ` ${latestStart.name} nhận muộn nhất lúc ${latestStart.time}.` : ""
                }`}
              </Alert>
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}