"use client";

import { useId, useRef, useState } from "react";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { AppointmentDetail, Photo } from "@/lib/api/types";
import {
  STATUS_MESSAGES,
  buildStatusSuccessMessage,
  classifyStatusUpdateError,
  describeNoStep,
  getSpaStatusStep,
  getStatusLockReasons,
  type SpaStatusAction,
  type StatusUpdateFailure,
} from "../status-update";

type StatusUpdateCardProps = {
  appointment: AppointmentDetail;
  photos: Photo[];
  // Thực hiện bước; ném lỗi (ApiError) khi bị từ chối. Thành công thì cha cập nhật appointment.status.
  onAdvance: (action: SpaStatusAction) => Promise<void>;
};

// MW-05 vùng 7 – Cập nhật trạng thái (UI-Screens.md, FR-EXE-05). Chỉ lịch spa: Received → InProgress, InProgress → Completed.
export function StatusUpdateCard({ appointment, photos, onAdvance }: StatusUpdateCardProps) {
  const reasonId = useId();
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<StatusUpdateFailure | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const step = getSpaStatusStep(appointment.status);
  const lockReasons = step ? getStatusLockReasons(step, appointment, photos) : [];
  const reasons =
    failure?.kind === "reason" && !lockReasons.includes(failure.message) ? [...lockReasons, failure.message] : lockReasons;

  async function handleAdvance() {
    if (!step || submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setFailure(null);
    setSuccess(null);
    try {
      await onAdvance(step.action);
      setSuccess(buildStatusSuccessMessage(step, appointment));
    } catch (error) {
      setFailure(classifyStatusUpdateError(error, step.action));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Cập nhật trạng thái" />
      <CardBody>
        <div className="flex flex-col gap-3.5">
          {step ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={step.from} />
                <span aria-hidden="true" className="text-muted">→</span>
                <StatusBadge status={step.to} />
              </div>
              <div className="[&>button]:w-full">
                <Button
                  size="lg"
                  disabled={lockReasons.length > 0 || isSubmitting}
                  aria-busy={isSubmitting ? "true" : undefined}
                  aria-describedby={reasons.length > 0 ? reasonId : undefined}
                  onClick={handleAdvance}
                >
                  {isSubmitting ? "Đang cập nhật…" : step.label}
                </Button>
              </div>
              {reasons.length > 0 && (
                <ul id={reasonId} className="flex flex-col gap-1.5 text-[13px] leading-[18px] text-muted">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2">
                      <Icon name="lock" className="mt-px size-4 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <div>
                <StatusBadge status={appointment.status} />
              </div>
              <p className="text-muted">{describeNoStep(appointment.status)}</p>
            </>
          )}
          {success && (
            <div role="status">
              <Alert tone="success">{success}</Alert>
            </div>
          )}
          {failure?.kind === "error" && <ErrorAlert error={failure.error} />}
          <p className="text-xs text-muted">{STATUS_MESSAGES.lifecycleNote}</p>
        </div>
      </CardBody>
    </Card>
  );
}
