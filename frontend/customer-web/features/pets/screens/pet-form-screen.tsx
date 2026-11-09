"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { NotFoundState } from "@/components/feedback/not-found-state";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PetForm } from "@/features/pets/components/pet-form";
import { isForbiddenError, isNotFoundError } from "@/lib/api/errors";
import { usePet } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";

// /thu-cung/them không có petId (thêm mới); /thu-cung/[petId]/sua có petId (sửa).
const DESCRIPTION = "Thông tin do bạn khai, cửa hàng đối chiếu lại cân nặng khi tiếp nhận.";
const LAYOUT_CLASS = "grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6 max-[1180px]:grid-cols-1";

function PetFormSkeleton() {
  return (
    <div role="status" aria-busy="true" className={LAYOUT_CLASS}>
      <span className="sr-only">Đang tải hồ sơ thú cưng…</span>
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-[60px] rounded-xl" />
            <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
              <Skeleton className="h-[42px] rounded-[10px]" />
              <Skeleton className="h-[42px] rounded-[10px]" />
              <Skeleton className="h-[42px] rounded-[10px]" />
              <Skeleton className="h-[42px] rounded-[10px]" />
            </div>
            <Skeleton className="h-[60px] rounded-xl" />
            <Skeleton className="h-[84px] rounded-[10px]" />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <Skeleton className="h-5 w-40 rounded-[10px]" />
          <Skeleton className="mt-3 h-9 w-24 rounded-[10px]" />
        </CardBody>
      </Card>
    </div>
  );
}

export function PetFormScreen() {
  const { petId } = useParams<{ petId?: string }>();
  const editingId = typeof petId === "string" ? petId : null;
  const isEditing = editingId !== null;
  const { data: pet, error, isFetching, refetch } = usePet(editingId);

  const title = !isEditing ? "Thêm thú cưng" : pet ? `Sửa hồ sơ ${pet.name}` : "Sửa hồ sơ";

  let content: ReactNode;
  if (!isEditing) {
    content = <PetForm />;
  } else if (error !== null) {
    if (isForbiddenError(error)) {
      content = <ForbiddenState />;
    } else if (isNotFoundError(error)) {
      content = (
        <NotFoundState
          title="Không tìm thấy hồ sơ"
          description="Không tìm thấy dữ liệu, có thể đã bị thay đổi."
          action={
            <ButtonLink href={ROUTES.pets} variant="secondary">
              Về danh sách thú cưng
            </ButtonLink>
          }
        />
      );
    } else {
      content = (
        <div>
          <ErrorAlert error={error} />
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              Thử lại
            </Button>
          </div>
        </div>
      );
    }
  } else if (pet === undefined) {
    content = <PetFormSkeleton />;
  } else {
    content = <PetForm key={pet.petId} pet={pet} />;
  }

  return (
    <>
      <nav aria-label="Đường dẫn" className="mb-2 flex items-center gap-1.5 text-[13px] text-muted">
        <Link href={ROUTES.pets} className="hover:text-lagoon">
          Thú cưng của tôi
        </Link>
        <Icon name="chev-r" className="size-3.5" />
        <span aria-current="page">{title}</span>
      </nav>
      <PageHeader title={title} description={DESCRIPTION} />
      {content}
    </>
  );
}

