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
} from "@/features/service-execution/execution";
import type { AppointmentServiceItem } from "@/lib/api/types";

const BLOCKERS_ID = "start-blockers";

type ServicesCardProps = {
  data: ExecutionData;
  completeFeedback: CompleteFeedback | null;
  onStart: () => void;
  onMarkDone: (service: AppointmentServiceItem, note: string) => void;
  onComplete: () => void;
};

// SW-11 vùng 5, 6, 7, 8 – Thẻ Dịch vụ (UI-Screens.md).
export function ServicesCard({ data, completeFeedback, onStart, onMarkDone, onComplete }: ServicesCardProps) {
  const { appointment } = data;
  const { done, total } = countServices(appointment);
  const flags = getExecutionFlags(appointment.status);
  const blockers = getStartBlockers(data);
  const pending = appointment.pendingCostConfirmation;

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
              <ServiceTask key={service.serviceId} service={service} canMarkDone={flags.canMarkDone} onMarkDone={onMarkDone} />
            ))}
          </ul>
        </div>
      </CardBody>
      {flags.canStart && (
        <CardFooter className="flex-col items-stretch">
          <Button
            size="lg"
            block
            disabled={blockers.length > 0}
            aria-describedby={blockers.length > 0 ? BLOCKERS_ID : undefined}
            onClick={onStart}
          >
            <Icon name="play" className="size-[18px]" />
            Bắt đầu thực hiện
          </Button>
          {blockers.length > 0 && (
            <ul id={BLOCKERS_ID} className="flex flex-col gap-1">
              {blockers.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5 text-xs leading-4 text-muted">
                  <Icon name="lock" className="mt-px size-3.5" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </CardFooter>
      )}
      {flags.canComplete && (
        <CardFooter className="flex-col items-stretch">
          <CompleteAction blockers={getCompleteBlockers(data)} feedback={completeFeedback} onComplete={onComplete} />
        </CardFooter>
      )}
    </Card>
  );
}
