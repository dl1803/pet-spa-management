"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckInHeader } from "@/features/reception-check-in/components/check-in-header";
import { CheckInSummary } from "@/features/reception-check-in/components/check-in-summary";
import { CostConfirmationNotice } from "@/features/reception-check-in/components/cost-confirmation-notice";
import { CostResponseDialog } from "@/features/reception-check-in/components/cost-response-dialog";
import { HotelWeightStep } from "@/features/reception-check-in/components/hotel-weight-step";
import { WeightField } from "@/features/reception-check-in/components/weight-field";
import { WeightOutcomeNotice } from "@/features/reception-check-in/components/weight-outcome-notice";
import {
  CHECK_IN_QUERY_KEY,
  describeWeightOutcome,
  getCheckInPanel,
  isConflictError,
  isCostConfirmationPendingError,
  isNotFoundError,
  NOT_CHECK_IN_STEP_MESSAGE,
  type CheckInData,
  type WeightOutcome,
} from "@/features/reception-check-in/check-in";
import {
  mockCheckInSpa,
  mockCheckWeight,
  mockGetCheckInData,
  mockRespondCostConfirmation,
} from "@/features/reception-check-in/mock-api";
import {
  EMPTY_WEIGHT_VALUES,
  formatWeightInput,
  toActualWeightRequest,
  validateActualWeight,
  type WeightFormValues,
} from "@/features/reception-check-in/weight";
import { isForbiddenError } from "@/lib/api/errors";
import type { ActualWeightRequest } from "@/lib/api/types";
import { formatAppointmentCode, formatLongDate } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { buildStoreDateTime, getStoreDateKey } from "@/lib/time";

const TITLE = "Tiếp nhận thú cưng";

export function CheckInScreen() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const [todayKey] = useState(() => getStoreDateKey(new Date()));

  return (
    <>
      <PageHeader title={TITLE} description={formatLongDate(buildStoreDateTime(todayKey, "12:00"))} />
      <div className="max-w-[860px]">
        {appointmentId ? (
          <CheckInLoader key={appointmentId} appointmentId={appointmentId} />
        ) : (
          <Card>
            <EmptyState
              icon="clipboard"
              title="Chưa chọn lịch hẹn"
              description="Chọn một lịch hẹn trong danh sách để tiếp nhận."
              action={
                <ButtonLink variant="secondary" href={ROUTES.appointments}>
                  Quay lại lịch hẹn
                </ButtonLink>
              }
            />
          </Card>
        )}
      </div>
    </>
  );
}

function CheckInSkeleton() {
  return (
    <Card>
      <div role="status" aria-busy="true">
        <span className="sr-only">Đang tải lịch hẹn…</span>
        <div className="flex items-center gap-4 border-b border-line-soft px-5 py-4">
          <Skeleton className="size-24 rounded-[28px]" />
          <div className="flex grow flex-col gap-2">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-3 gap-3 max-[860px]:grid-cols-1">
            <Skeleton className="h-[72px] rounded-xl" />
            <Skeleton className="h-[72px] rounded-xl" />
            <Skeleton className="h-[72px] rounded-xl" />
          </div>
          <Skeleton className="h-[52px] w-[260px] rounded-[10px] max-[640px]:w-full" />
        </div>
      </div>
    </Card>
  );
}

function CheckInLoader({ appointmentId }: { appointmentId: string }) {
  const query = useQuery({
    queryKey: [...CHECK_IN_QUERY_KEY, appointmentId],
    queryFn: () => mockGetCheckInData(appointmentId),
  });

  if (query.data === undefined) {
    if (!query.isError) return <CheckInSkeleton />;
    if (isForbiddenError(query.error)) return <ForbiddenState />;
    if (isNotFoundError(query.error)) {
      return (
        <Card>
          <EmptyState
            icon="clipboard"
            title="Không tìm thấy lịch hẹn"
            description="Lịch hẹn có thể đã bị thay đổi hoặc không còn tồn tại."
            action={
              <ButtonLink variant="secondary" href={ROUTES.appointments}>
                Quay lại lịch hẹn
              </ButtonLink>
            }
          />
        </Card>
      );
    }
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={query.error} className="w-full" />
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  return <CheckInCard data={query.data} reload={() => void query.refetch()} />;
}

type CheckInCardProps = {
  data: CheckInData;
  reload: () => void;
};

function CheckInCard({ data, reload }: CheckInCardProps) {
  const { appointment, pet } = data;
  const appointmentId = appointment.appointmentId;
  const isSpa = appointment.type === "Spa";
  const panel = getCheckInPanel(appointment);
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const [outcome, setOutcome] = useState<WeightOutcome | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WeightFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: EMPTY_WEIGHT_VALUES,
  });

  function reloadAppointment() {
    void queryClient.invalidateQueries({ queryKey: [...CHECK_IN_QUERY_KEY, appointmentId] });
  }

  const weightMutation = useMutation({
    mutationFn: async (request: ActualWeightRequest) =>
      isSpa ? (await mockCheckInSpa(appointmentId, request)).weightCheck : (await mockCheckWeight(appointmentId, request)).weightCheck,
    onSuccess: (weightCheck, request) => {
      setOutcome(
        weightCheck
          ? {
              weightCheck,
              actualWeightKg: request.actualWeightKg,
              declaredWeightKg: pet.weightKg,
              previousSizeGroup: appointment.sizeGroup,
            }
          : null,
      );
      if (isSpa) showSuccess(`Đã tiếp nhận ${pet.name}`);
      reloadAppointment();
    },
    onError: (error) => {
      if (isConflictError(error)) reloadAppointment();
    },
  });

  const respondMutation = useMutation({
    mutationFn: (accept: boolean) => mockRespondCostConfirmation(appointmentId, { accept }),
    onSuccess: (_result, accept) => {
      setIsDialogOpen(false);
      showSuccess(
        accept
          ? `Đã ghi nhận khách đồng ý chi phí mới cho ${pet.name}`
          : `Đã ghi nhận khách từ chối chi phí mới. Lịch của ${pet.name} đã bị hủy`,
      );
      reloadAppointment();
    },
    onError: (error) => {
      if (isConflictError(error)) {
        setIsDialogOpen(false);
        reloadAppointment();
      }
    },
  });

  function onSubmit(values: WeightFormValues) {
    const request = toActualWeightRequest(values);
    if (request === null || weightMutation.isPending) return;
    weightMutation.mutate(request);
  }

  function openDialog() {
    respondMutation.reset();
    setIsDialogOpen(true);
  }

  const weightError = weightMutation.error !== null && !isCostConfirmationPendingError(weightMutation.error) ? weightMutation.error : null;
  const respondError = !isDialogOpen ? respondMutation.error : null;
  const backLabel = isSpa ? "Quay lại lịch hẹn" : "Quay lại";
  const outcomeNotice = outcome !== null ? describeWeightOutcome(outcome, isSpa) : null;

  return (
    <>
      <Card>
        <CheckInHeader data={data} />
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardBody>
            <div className="flex flex-col gap-4">
              <CheckInSummary data={data} weightLabel={panel.kind === "recorded" ? "Cân nặng trong hồ sơ" : "Cân nặng khai báo"} />

              {panel.kind === "form" && isSpa && (
                <div className="flex flex-wrap items-start gap-4">
                  <WeightField
                    id="check-in-weight"
                    registration={register("actualWeight", { validate: validateActualWeight })}
                    error={errors.actualWeight?.message}
                  />
                  <div className="min-w-[240px] grow">
                    <div className="mb-1.5 text-[13px] font-semibold leading-[18px]">Kết quả đối chiếu</div>
                    <div className="flex min-h-[52px] items-center rounded-xl bg-mist px-4 text-xs text-muted">
                      Hệ thống đối chiếu với hồ sơ ngay khi bạn xác nhận tiếp nhận.
                    </div>
                  </div>
                </div>
              )}
              {panel.kind === "form" && !isSpa && (
                <HotelWeightStep
                  mode="form"
                  registration={register("actualWeight", { validate: validateActualWeight })}
                  error={errors.actualWeight?.message}
                  isSubmitting={weightMutation.isPending}
                />
              )}

              {panel.kind === "pending" && (
                <>
                  <WeightField id="check-in-weight" readOnlyValue={formatWeightInput(panel.confirmation.actualWeightKg)} />
                  <CostConfirmationNotice
                    confirmation={panel.confirmation}
                    currentSizeGroup={appointment.sizeGroup}
                    declaredWeightKg={pet.weightKg}
                    onExpire={reload}
                  />
                </>
              )}

              {panel.kind === "recorded" && isSpa && (
                <>
                  {panel.actualWeightKg !== null && (
                    <WeightField id="check-in-weight" readOnlyValue={formatWeightInput(panel.actualWeightKg)} />
                  )}
                  {outcomeNotice !== null && <WeightOutcomeNotice notice={outcomeNotice} />}
                </>
              )}
              {panel.kind === "recorded" && !isSpa && (
                <HotelWeightStep mode="recorded" actualWeightKg={panel.actualWeightKg} outcome={outcome} />
              )}

              {panel.kind === "unavailable" && (
                <Alert tone="neutral" icon="note">
                  {NOT_CHECK_IN_STEP_MESSAGE}
                </Alert>
              )}

              <ErrorAlert error={weightError} />
              <ErrorAlert error={respondError} />
            </div>
          </CardBody>
          <CardFooter>
            <ButtonLink variant="ghost" href={ROUTES.appointments}>
              {backLabel}
            </ButtonLink>
            {panel.kind === "form" && isSpa && (
              <div className="ml-auto">
                <Button type="submit" loading={weightMutation.isPending}>
                  Xác nhận tiếp nhận
                </Button>
              </div>
            )}
            {panel.kind === "pending" && (
              <div className="ml-auto">
                <Button variant="secondary" onClick={openDialog}>
                  <Icon name="phone" />
                  Ghi nhận phản hồi của khách
                </Button>
              </div>
            )}
            {panel.kind === "recorded" && isSpa && (
              <div className="ml-auto">
                <ButtonLink variant="secondary" href={ROUTES.appointments}>
                  Tiếp nhận lịch tiếp theo
                </ButtonLink>
              </div>
            )}
          </CardFooter>
        </form>
      </Card>
      {isDialogOpen && panel.kind === "pending" && (
        <CostResponseDialog
          petName={pet.name}
          appointmentCode={formatAppointmentCode(appointmentId)}
          confirmation={panel.confirmation}
          isSubmitting={respondMutation.isPending}
          error={respondMutation.error}
          onSubmit={(accept) => respondMutation.mutate(accept)}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </>
  );
}

