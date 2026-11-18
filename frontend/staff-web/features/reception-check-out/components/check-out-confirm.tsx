import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import type { CheckOutGate } from "@/features/reception-check-out/check-out";

const LOCK_REASON_ID = "check-out-lock-reason";

type CheckOutConfirmCardProps = {
  gate: CheckOutGate;
  cageCode: string | null;
  isSubmitting: boolean;
  error: unknown;
  onConfirm: () => void;
};

export function CheckOutConfirmCard({ gate, cageCode, isSubmitting, error, onConfirm }: CheckOutConfirmCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-col gap-3">
          <ErrorAlert error={error} />
          <Button
            size="lg"
            block
            loading={isSubmitting}
            disabled={!gate.ready}
            aria-describedby={gate.ready ? undefined : LOCK_REASON_ID}
            onClick={onConfirm}
          >
            <Icon name="handover" />
            Xác nhận trả thú cưng
          </Button>
          {!gate.ready && (
            <p id={LOCK_REASON_ID} className="flex items-start gap-1.5 text-xs text-muted">
              <Icon name="lock" className="mt-px size-3.5 shrink-0" />
              {gate.reason}
            </p>
          )}
          <p className="text-xs text-muted">
            {cageCode !== null
              ? `Sau khi xác nhận, lịch chuyển Hoàn tất và chuồng ${cageCode} trống để nhận bé khác.`
              : "Sau khi xác nhận, lịch chuyển Hoàn tất."}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
