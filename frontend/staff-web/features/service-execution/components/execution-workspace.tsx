"use client";

import { useState } from "react";
import { useToast } from "@/components/feedback/toast";
import { ExecutionHeader } from "@/features/service-execution/components/execution-header";
import { AfterPhotoCard, BeforePhotoCard } from "@/features/service-execution/components/photo-cards";
import { PetProfileNote } from "@/features/service-execution/components/pet-profile-note";
import { ServicesCard } from "@/features/service-execution/components/services-card";
import {
  PHOTO_ERROR_UNREADABLE,
  getCompleteFeedback,
  getExecutionFlags,
  getStartFeedback,
  pickLatestPhoto,
  type CompleteFeedback,
  type ExecutionData,
  type StartFeedback,
} from "@/features/service-execution/execution";
import { resizePhoto } from "@/features/service-execution/photo-resize";
import { getErrorMessage, toApiError } from "@/lib/api/errors";
import type { ApiError } from "@/lib/api/errors";
import type { AppointmentServiceItem, PhotoKind } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";
import { useCompleteAppointment, useMarkServiceDone, useStartAppointment, useUploadPhoto } from "@/lib/queries/appointments";

type ExecutionWorkspaceProps = {
  // Dữ liệu mới nhất của lịch (từ truy vấn); mỗi thao tác ghi xong thì truy vấn được làm mới và `data` đổi theo.
  data: ExecutionData;
  todayKey: string;
  // Gọi sau khi hoàn tất lịch thành công; màn cha chuyển sang Lịch sử công việc.
  onCompleted: () => void;
};

const PHOTO_TOAST: Record<PhotoKind, string> = {
  Before: "Đã tải ảnh trước chăm sóc",
  After: "Đã tải ảnh sau chăm sóc",
};

type UploadState = { kind: PhotoKind; percent: number };
type UploadFailure = { kind: PhotoKind; message: string };

// SW-11 Thực hiện dịch vụ – UI-Screens.md. Mỗi thao tác gọi API thật; lý do khóa nút tính ở web, backend vẫn kiểm tra lại (409).
export function ExecutionWorkspace({ data, todayKey, onCompleted }: ExecutionWorkspaceProps) {
  const { showSuccess } = useToast();
  const startMutation = useStartAppointment();
  const markMutation = useMarkServiceDone();
  const completeMutation = useCompleteAppointment();
  const uploadMutation = useUploadPhoto();

  // Phản hồi lỗi gần nhất của từng thao tác; xóa khi bắt đầu một thao tác mới.
  const [startFeedback, setStartFeedback] = useState<StartFeedback | null>(null);
  const [completeFeedback, setCompleteFeedback] = useState<CompleteFeedback | null>(null);
  const [markError, setMarkError] = useState<ApiError | null>(null);
  const [markingServiceId, setMarkingServiceId] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [uploadFailure, setUploadFailure] = useState<UploadFailure | null>(null);

  const { appointment, pet, photos } = data;
  const appointmentId = appointment.appointmentId;
  const flags = getExecutionFlags(appointment.status);
  // Một thao tác ghi tại một thời điểm: tránh gửi trùng và tránh thao tác chồng lên lịch đang đổi trạng thái.
  const busy = upload !== null || startMutation.isPending || markMutation.isPending || completeMutation.isPending;

  function clearFeedback() {
    setStartFeedback(null);
    setCompleteFeedback(null);
    setMarkError(null);
    setUploadFailure(null);
  }

  async function handleUpload(kind: PhotoKind, file: File) {
    if (busy) return;
    clearFeedback();
    setUpload({ kind, percent: 0 });
    try {
      let prepared: File;
      try {
        prepared = await resizePhoto(file);
      } catch {
        setUploadFailure({ kind, message: PHOTO_ERROR_UNREADABLE });
        return;
      }
      await uploadMutation.mutateAsync({
        appointmentId,
        kind,
        file: prepared,
        onProgress: (percent) => setUpload({ kind, percent }),
      });
      showSuccess(PHOTO_TOAST[kind]);
    } catch (error) {
      setUploadFailure({ kind, message: getErrorMessage(error) });
    } finally {
      setUpload(null);
    }
  }

  async function handleStart() {
    if (busy) return;
    clearFeedback();
    try {
      await startMutation.mutateAsync(appointmentId);
    } catch (error) {
      setStartFeedback(getStartFeedback(error));
    }
  }

  async function handleMarkDone(service: AppointmentServiceItem, note: string) {
    if (busy) return;
    clearFeedback();
    setMarkingServiceId(service.serviceId);
    try {
      await markMutation.mutateAsync({ appointmentId, serviceId: service.serviceId, note });
      showSuccess(`Đã đánh dấu xong ${service.name ?? "dịch vụ"}`);
    } catch (error) {
      setMarkError(toApiError(error));
    } finally {
      setMarkingServiceId(null);
    }
  }

  async function handleComplete() {
    if (busy) return;
    clearFeedback();
    try {
      await completeMutation.mutateAsync(appointmentId);
    } catch (error) {
      setCompleteFeedback(getCompleteFeedback(error));
      return;
    }
    showSuccess(`Đã hoàn tất ${formatAppointmentCode(appointmentId)}. Bàn giao ${pet.name} ra quầy.`);
    onCompleted();
  }

  const uploadingOf = (kind: PhotoKind) => (upload?.kind === kind ? { percent: upload.percent } : null);
  const uploadErrorOf = (kind: PhotoKind) => (uploadFailure?.kind === kind ? uploadFailure.message : null);

  return (
    <>
      <ExecutionHeader data={data} />
      <PetProfileNote pet={pet} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-6 max-[1180px]:grid-cols-1">
        <div className="grid grid-cols-2 items-start gap-4 max-[640px]:grid-cols-1">
          <BeforePhotoCard
            photo={pickLatestPhoto(photos, "Before")}
            petName={pet.name}
            todayKey={todayKey}
            canUpload={flags.canUploadBefore}
            onUpload={(file) => void handleUpload("Before", file)}
            disabled={busy}
            uploading={uploadingOf("Before")}
            uploadError={uploadErrorOf("Before")}
            highlighted={startFeedback?.kind === "reason" && startFeedback.highlightBeforePhoto}
          />
          <AfterPhotoCard
            photo={pickLatestPhoto(photos, "After")}
            petName={pet.name}
            todayKey={todayKey}
            canUpload={flags.canUploadAfter}
            onUpload={(file) => void handleUpload("After", file)}
            disabled={busy}
            uploading={uploadingOf("After")}
            uploadError={uploadErrorOf("After")}
            highlighted={completeFeedback?.kind === "reason" && completeFeedback.highlightAfterPhoto}
          />
        </div>
        <ServicesCard
          data={data}
          completeFeedback={completeFeedback}
          startFeedback={startFeedback}
          markError={markError}
          busy={busy}
          starting={startMutation.isPending}
          completing={completeMutation.isPending}
          markingServiceId={markingServiceId}
          onStart={() => void handleStart()}
          onMarkDone={(service, note) => void handleMarkDone(service, note)}
          onComplete={() => void handleComplete()}
        />
      </div>
    </>
  );
}
