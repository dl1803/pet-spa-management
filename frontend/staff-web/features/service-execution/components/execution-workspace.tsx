"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/feedback/toast";
import { ExecutionHeader } from "@/features/service-execution/components/execution-header";
import { AfterPhotoCard, BeforePhotoCard } from "@/features/service-execution/components/photo-cards";
import { PetProfileNote } from "@/features/service-execution/components/pet-profile-note";
import { ServicesCard } from "@/features/service-execution/components/services-card";
import { getExecutionFlags, pickLatestPhoto, type ExecutionData } from "@/features/service-execution/execution";
import { withPhoto, withServiceDone, withStarted } from "@/features/service-execution/local-updates";
import type { AppointmentServiceItem, PhotoKind } from "@/lib/api/types";

type ExecutionWorkspaceProps = {
  initial: ExecutionData;
  todayKey: string;
};

const PHOTO_TOAST: Record<PhotoKind, string> = {
  Before: "Đã tải ảnh trước chăm sóc",
  After: "Đã tải ảnh sau chăm sóc",
};

// SW-11 Thực hiện dịch vụ – UI-Screens.md. Dữ liệu mô phỏng: thao tác chỉ đổi trạng thái trên màn, chưa gọi API.
export function ExecutionWorkspace({ initial, todayKey }: ExecutionWorkspaceProps) {
  const { showSuccess } = useToast();
  const [data, setData] = useState(initial);
  const objectUrls = useRef<string[]>([]);
  const photoCount = useRef(0);

  // Ảnh xem trước tạo từ tệp đã chọn; thu hồi khi rời màn.
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const { appointment, pet, photos } = data;
  const flags = getExecutionFlags(appointment.status);

  function handleUpload(kind: PhotoKind, file: File) {
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    photoCount.current += 1;
    const photo = { photoId: `local-photo-${photoCount.current}`, kind, url, uploadedAt: new Date().toISOString() };
    setData((current) => withPhoto(current, photo));
    showSuccess(PHOTO_TOAST[kind]);
  }

  function handleStart() {
    setData((current) => withStarted(current));
  }

  function handleMarkDone(service: AppointmentServiceItem, note: string) {
    setData((current) => withServiceDone(current, service.serviceId, note, new Date().toISOString()));
    showSuccess(`Đã đánh dấu xong ${service.name ?? "dịch vụ"}`);
  }

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
          />
        </div>
        <ServicesCard data={data} onStart={handleStart} onMarkDone={handleMarkDone} />
      </div>
    </>
  );
}
