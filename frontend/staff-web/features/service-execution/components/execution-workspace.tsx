"use client";

import { useEffect, useRef, useState } from "react";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { ExecutionHeader } from "@/features/service-execution/components/execution-header";
import { AfterPhotoCard, BeforePhotoCard } from "@/features/service-execution/components/photo-cards";
import { PetProfileNote } from "@/features/service-execution/components/pet-profile-note";
import { ServicesCard } from "@/features/service-execution/components/services-card";
import {
  getCompleteFeedback,
  getExecutionFlags,
  pickLatestPhoto,
  type CompleteFeedback,
  type ExecutionData,
} from "@/features/service-execution/execution";
import { completeLocally, withPhoto, withServiceDone, withStarted } from "@/features/service-execution/local-updates";
import { createPhotoUrlTracker } from "@/features/service-execution/photo-urls";
import type { AppointmentServiceItem, Photo, PhotoKind } from "@/lib/api/types";
import { formatAppointmentCode } from "@/lib/format";

type ExecutionWorkspaceProps = {
  initial: ExecutionData;
  todayKey: string;
  // Gọi sau khi hoàn tất lịch thành công; màn cha chuyển sang Lịch sử công việc.
  onCompleted: () => void;
};

const PHOTO_TOAST: Record<PhotoKind, string> = {
  Before: "Đã tải ảnh trước chăm sóc",
  After: "Đã tải ảnh sau chăm sóc",
};

// SW-11 Thực hiện dịch vụ – UI-Screens.md. Dữ liệu mô phỏng: thao tác chỉ đổi trạng thái trên màn, chưa gọi API.
export function ExecutionWorkspace({ initial, todayKey, onCompleted }: ExecutionWorkspaceProps) {
  const { showSuccess } = useToast();
  const [data, setData] = useState(initial);
  // Phản hồi lỗi gần nhất khi hoàn tất; xóa khi dữ liệu lịch thay đổi.
  const [completeFeedback, setCompleteFeedback] = useState<CompleteFeedback | null>(null);
  const photoCount = useRef(0);

  // URL ảnh xem trước đang dùng theo loại; thu hồi URL cũ khi đổi ảnh, thu hồi hết khi rời màn.
  const [photoUrls] = useState(() => createPhotoUrlTracker((url) => URL.revokeObjectURL(url)));

  useEffect(() => {
    return () => photoUrls.revokeAll();
  }, [photoUrls]);

  const { appointment, pet, photos } = data;
  const flags = getExecutionFlags(appointment.status);

  function handleUpload(kind: PhotoKind, file: File) {
    const url = URL.createObjectURL(file);
    photoCount.current += 1;
    const photo: Photo = { photoId: `local-photo-${photoCount.current}`, kind, url, uploadedAt: new Date().toISOString() };
    const next = withPhoto(data, photo);
    if (next === data) {
      // Lịch không còn cho tải loại ảnh này: không giữ URL vừa tạo, không báo thành công.
      URL.revokeObjectURL(url);
      return;
    }
    photoUrls.replace(kind, url);
    setData(next);
    setCompleteFeedback(null);
    showSuccess(PHOTO_TOAST[kind]);
  }

  function handleStart() {
    setData((current) => withStarted(current));
  }

  function handleMarkDone(service: AppointmentServiceItem, note: string) {
    setData((current) => withServiceDone(current, service.serviceId, note, new Date().toISOString()));
    setCompleteFeedback(null);
    showSuccess(`Đã đánh dấu xong ${service.name ?? "dịch vụ"}`);
  }

  function handleComplete() {
    const result = completeLocally(data);
    if (!result.ok) {
      setCompleteFeedback(getCompleteFeedback(result.error));
      return;
    }
    setCompleteFeedback(null);
    setData(result.data);
    showSuccess(`Đã hoàn tất ${formatAppointmentCode(appointment.appointmentId)}. Bàn giao ${pet.name} ra quầy.`);
    onCompleted();
  }

  // 403: thay nội dung màn bằng trạng thái không có quyền (Conventions 5.1).
  if (completeFeedback?.kind === "forbidden") return <ForbiddenState />;

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
            onUpload={(file) => handleUpload("Before", file)}
          />
          <AfterPhotoCard
            photo={pickLatestPhoto(photos, "After")}
            petName={pet.name}
            todayKey={todayKey}
            canUpload={flags.canUploadAfter}
            onUpload={(file) => handleUpload("After", file)}
            highlighted={completeFeedback?.kind === "reason" && completeFeedback.highlightAfterPhoto}
          />
        </div>
        <ServicesCard
          data={data}
          completeFeedback={completeFeedback}
          onStart={handleStart}
          onMarkDone={handleMarkDone}
          onComplete={handleComplete}
        />
      </div>
    </>
  );
}
