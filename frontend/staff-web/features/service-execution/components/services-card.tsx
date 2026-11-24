import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { CompleteAction } from "@/features/service-execution/components/complete-action";
import { CostConfirmationAlert } from "@/features/service-execution/components/cost-confirmation-alert";
import { ServiceTask } from "@/features/service-execution/components/service-task";
import {
  countServices,
  getCompleteBlockers,
  getExecutionFlags,
  getStartBlockers,
  type CompleteFeedback,
  type ExecutionData,
  type StartFeedback,
} from "@/features/service-execution/execution";
import type { AppointmentServiceItem } from "@/lib/api/types";

const BLOCKERS_ID = "start-blockers";

type ServicesCardProps = {
  data: ExecutionData;
  completeFeedback: CompleteFeedback | null;
  onStart: () => void;
  onMarkDone: (service: AppointmentServiceItem, note: string) => void;
  onComplete: () => void;
  // Đang có thao tác ghi: khóa mọi nút. `starting`, `completing`, `markingServiceId`: thao tác nào đang gửi.
  busy?: boolean;
  starting?: boolean;
  completing?: boolean;
  markingServiceId?: string | null;
  // Phản hồi lỗi của Bắt đầu, và lỗi khi đánh dấu dịch vụ xong (hiện tại chỗ, giữ danh sách và ghi chú đang nhập).
  startFeedback?: StartFeedback | null;
  markError?: unknown;
};

// SW-11 vùng 5, 6, 7, 8 – Thẻ Dịch vụ (UI-Screens.md).
export function ServicesCard({
  data,
  completeFeedback,
  onStart,
  onMarkDone,
  onComplete,
  busy = false,
  starting = false,
  completing = false,
  markingServiceId = null,
  startFeedback = null,
  markError = null,
}: ServicesCardProps) {
  const { appointment } = data;
  const { done, total } = countServices(appointment);
  const flags = getExecutionFlags(appointment.status);
  const blockers = getStartBlockers(data);
  const pending = appointment.pendingCostConfirmation;
  const isServerStartReason = startFeedback?.kind === "reason";
  const startReasons = isServerStartReason ? [startFeedback.reason] : blockers;

  return (
    <Card>
      <CardHeader title="Dịch vụ">
        <span className="text-[13px] text-muted">
          {done} / {total} xong
        </span>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-3">
          {pending != null && <CostConfirmationAlert currentSizeGroup={appointment.sizeGroup} confirmation={pending} />}
          <ul className="flex flex-col gap-3">
            {(appointment.services ?? []).map((service) => (
              <ServiceTask
                key={service.serviceId}
                service={service}
                canMarkDone={flags.canMarkDone}
                onMarkDone={onMarkDone}
                busy={busy}
                pending={markingServiceId === service.serviceId}
              />
            ))}
          </ul>
          {markError != null && <ErrorAlert error={markError} />}
        </div>
      </CardBody>
      {flags.canStart && (
        <CardFooter className="flex-col items-stretch">
          <Button
            size="lg"
            block
            disabled={blockers.length > 0 || busy}
            loading={starting}
            loadingText="Đang bắt đầu…"
            aria-describedby={startReasons.length > 0 ? BLOCKERS_ID : undefined}
            onClick={onStart}
          >
            <Icon name="play" className="size-[18px]" />
            Bắt đầu thực hiện
          </Button>
          {startReasons.length > 0 && (
            <ul id={BLOCKERS_ID} role={isServerStartReason ? "alert" : undefined} className="flex flex-col gap-1">
              {startReasons.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5 text-xs leading-4 text-muted">
                  <Icon name="lock" className="mt-px size-3.5" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
          {startFeedback?.kind === "error" && <ErrorAlert error={startFeedback.error} />}
        </CardFooter>
      )}
      {flags.canComplete && (
        <CardFooter className="flex-col items-stretch">
          <CompleteAction
            blockers={getCompleteBlockers(data)}
            feedback={completeFeedback}
            onComplete={onComplete}
            busy={busy}
            loading={completing}
          />
        </CardFooter>
      )}
    </Card>
  );
}
