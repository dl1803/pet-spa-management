"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { HotelCageStep, HotelStayPaymentStep } from "@/features/reception-check-in/components/hotel-stay-steps";
import { HotelWeightStep } from "@/features/reception-check-in/components/hotel-weight-step";
import { WeightField } from "@/features/reception-check-in/components/weight-field";
import { WeightOutcomeNotice } from "@/features/reception-check-in/components/weight-outcome-notice";
import {
  describeWeightOutcome,
  getCheckInPanel,
  getHotelCheckInGate,
  isConflictError,
  isCostConfirmationPendingError,
  isNotFoundError,
  isPaymentNotDueError,
  NOT_CHECK_IN_STEP_MESSAGE,
  resolvePendingCostConfirmation,
  type CheckInData,
  type WeightOutcome,
} from "@/features/reception-check-in/check-in";
import { mockCheckInHotel } from "@/features/reception-check-in/mock-api";
import {
  EMPTY_WEIGHT_VALUES,
  formatWeightInput,
  toActualWeightRequest,
  validateActualWeight,
  type WeightFormValues,
} from "@/features/reception-check-in/weight";
import { isForbiddenError } from "@/lib/api/errors";
import type { ActualWeightRequest, WeightCheck } from "@/lib/api/types";
import { formatAppointmentCode, formatLongDate } from "@/lib/format";
import {
  appointmentKeys,
  useAppointment,
  useCheckInAppointment,
  useRespondCostConfirmation,
  useWeightCheckAppointment,
} from "@/lib/queries/appointments";
import { getRememberedPendingCostConfirmation } from "@/lib/queries/pending-cost-confirmation";
import { usePet } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";
import { buildStoreDateTime, getStoreDateKey } from "@/lib/time";

const TITLE = "Tiếp nhận thú cưng";
const HOTEL_LOCK_REASON_ID = "hotel-check-in-lock-reason";

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
  const appointmentQuery = useAppointment(appointmentId);
  const appointment = appointmentQuery.data;
  const petQuery = usePet(appointment?.petId ?? null);
  const pet = petQuery.data;

  if (appointment === undefined || pet === undefined) {
    // Chưa có lịch thì xét lỗi của lịch; có lịch rồi mới xét lỗi hồ sơ thú cưng.
    const failed = appointment === undefined ? appointmentQuery : petQuery;
    if (!failed.isError) return <CheckInSkeleton />;
    if (isForbiddenError(failed.error)) return <ForbiddenState />;
    if (appointment === undefined && isNotFoundError(failed.error)) {
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
        <ErrorAlert error={failed.error} className="w-full" />
        <Button variant="secondary" onClick={() => void failed.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  // Tiền lưu trú và mã chuồng của lịch lưu trú chưa nối API nên để null: nút "Xác nhận tiếp nhận" của lịch lưu trú giữ khóa.
  return <CheckInCard data={{ appointment, pet, cageCode: null, stay: null }} reload={() => void appointmentQuery.refetch()} />;
}

type CheckInCardProps = {
  data: CheckInData;
  reload: () => void;
};

function CheckInCard({ data: loaded, reload }: CheckInCardProps) {
  // Backend chưa trả pendingCostConfirmation ở chi tiết lịch: ghép yêu cầu đã nhận sau lần đối chiếu cân nặng để màn vẫn hiện đồng hồ và nút ghi nhận phản hồi.
  const appointment = resolvePendingCostConfirmation(loaded.appointment, getRememberedPendingCostConfirmation(loaded.appointment.appointmentId));
  const data: CheckInData = { ...loaded, appointment };
  const { pet } = data;
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

  // Chỉ còn bước tiếp nhận lưu trú dùng hàm này để làm mới chi tiết lịch sau khi gọi dữ liệu mô phỏng.
  function reloadAppointment() {
    void queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
  }

  const spaCheckInMutation = useCheckInAppointment();
  const hotelWeightMutation = useWeightCheckAppointment();
  const respondMutation = useRespondCostConfirmation();
  const weightMutation = isSpa ? spaCheckInMutation : hotelWeightMutation;

  function handleWeightChecked(request: ActualWeightRequest, weightCheck: WeightCheck | undefined) {
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
    if (isSpa && weightCheck?.result !== "NEEDS_CONFIRMATION") showSuccess(`Đã tiếp nhận ${pet.name}`);
  }

  function handleRespond(accept: boolean) {
    respondMutation.mutate(
      { appointmentId, request: { accept } },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setOutcome(null);
          showSuccess(
            accept
              ? `Đã ghi nhận khách đồng ý chi phí mới cho ${pet.name}`
              : `Đã ghi nhận khách từ chối chi phí mới. Lịch của ${pet.name} đã bị hủy`,
          );
        },
        onError: (error) => {
          // Lịch đã đổi trạng thái hoặc không còn yêu cầu đang chờ: đóng hộp thoại để lỗi hiện ngoài hộp thoại; dữ liệu đã được tải lại.
          if (isConflictError(error) || isNotFoundError(error)) setIsDialogOpen(false);
        },
      },
    );
  }

  const checkInMutation = useMutation({
    mutationFn: () => mockCheckInHotel(appointmentId),
    onSuccess: () => {
      showSuccess(
        data.cageCode !== null ? `Đã tiếp nhận ${pet.name}. Chuồng ${data.cageCode} đang chứa ${pet.name}` : `Đã tiếp nhận ${pet.name}`,
      );
      reloadAppointment();
    },
    onError: (error) => {
      if (isConflictError(error)) reloadAppointment();
    },
  });

  function onSubmit(values: WeightFormValues) {
    const request = toActualWeightRequest(values);
    if (request === null || weightMutation.isPending) return;
    if (isSpa) {
      spaCheckInMutation.mutate({ appointmentId, request }, { onSuccess: (result) => handleWeightChecked(request, result.weightCheck) });
    } else {
      hotelWeightMutation.mutate({ appointmentId, request }, { onSuccess: (result) => handleWeightChecked(request, result.weightCheck) });
    }
  }

  function openDialog() {
    respondMutation.reset();
    setIsDialogOpen(true);
  }

  // 409 COST_CONFIRMATION_PENDING đã có vùng cảnh báo riêng khi biết yêu cầu đang chờ; chưa biết thì hiện lỗi của backend.
  const weightError =
    weightMutation.error !== null && !(isCostConfirmationPendingError(weightMutation.error) && panel.kind === "pending")
      ? weightMutation.error
      : null;
  const respondError = !isDialogOpen ? respondMutation.error : null;
  const backLabel = isSpa ? "Quay lại lịch hẹn" : "Quay lại";
  const outcomeNotice = outcome !== null ? describeWeightOutcome(outcome, isSpa) : null;
  const gate = isSpa || panel.kind === "unavailable" ? null : getHotelCheckInGate(data);

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

              {!isSpa && panel.kind !== "unavailable" && data.stay !== null && (
                <>
                  <HotelStayPaymentStep
                    stay={data.stay}
                    appointment={appointment}
                    canCollect={panel.kind === "recorded"}
                    isHighlighted={isPaymentNotDueError(checkInMutation.error)}
                  />
                  <HotelCageStep petName={pet.name} cageCode={data.cageCode} />
                </>
              )}

              {panel.kind === "unavailable" && (
                <Alert tone="neutral" icon="note">
                  {NOT_CHECK_IN_STEP_MESSAGE}
                </Alert>
              )}

              <ErrorAlert error={weightError} />
              <ErrorAlert error={respondError} />
              <ErrorAlert error={checkInMutation.error} />
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
            {panel.kind === "pending" && isSpa && (
              <div className="ml-auto">
                <Button variant="secondary" onClick={openDialog}>
                  <Icon name="phone" />
                  Ghi nhận phản hồi của khách
                </Button>
              </div>
            )}
            {gate !== null && (
              <div className="ml-auto flex flex-col items-end gap-1.5 max-[640px]:w-full max-[640px]:items-stretch">
                <div className="flex flex-wrap justify-end gap-2.5">
                  {panel.kind === "pending" && (
                    <Button variant="secondary" onClick={openDialog}>
                      <Icon name="phone" />
                      Ghi nhận phản hồi của khách
                    </Button>
                  )}
                  <Button
                    loading={checkInMutation.isPending}
                    disabled={!gate.ready}
                    aria-describedby={gate.ready ? undefined : HOTEL_LOCK_REASON_ID}
                    onClick={() => checkInMutation.mutate()}
                  >
                    Xác nhận tiếp nhận
                  </Button>
                </div>
                {!gate.ready && (
                  <p id={HOTEL_LOCK_REASON_ID} className="flex items-start gap-1.5 text-xs text-muted">
                    <Icon name="lock" className="mt-px size-3.5 shrink-0" />
                    {gate.reason}
                  </p>
                )}
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
          onSubmit={handleRespond}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </>
  );
}

