"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Alert } from "@/components/feedback/alert";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PetCard } from "@/features/pets/components/pet-card";
import { PetsEmptyState } from "@/features/pets/components/pets-empty-state";
import { RemovePetDialog } from "@/features/pets/components/remove-pet-dialog";
import { PET_REMOVED_MESSAGE } from "@/features/pets/forms";
import type { Pet } from "@/lib/api/types";
import { useDeletePet, usePets } from "@/lib/queries/pets";
import { ROUTES } from "@/lib/routes";

const TITLE = "Thú cưng của tôi";
const DESCRIPTION = "Hồ sơ dùng để tính giá, thời lượng dịch vụ và chọn chuồng phù hợp.";
const GRID_CLASS = "grid grid-cols-[repeat(3,minmax(0,1fr))] gap-4 max-[980px]:grid-cols-[minmax(0,1fr)]";

function PetsSkeleton() {
  return (
    <div role="status" aria-busy="true" className={GRID_CLASS}>
      <span className="sr-only">Đang tải danh sách thú cưng…</span>
      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <CardBody>
            <div className="flex items-start gap-4">
              <Skeleton className="size-[72px] shrink-0 rounded-[22px]" />
              <div className="grow">
                <Skeleton className="h-6 w-28 rounded-[10px]" />
                <Skeleton className="mt-2 h-5 w-36 rounded-[10px]" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function PetsScreen() {
  const { showSuccess } = useToast();
  const { data, error, isFetching, refetch } = usePets();
  const { mutate, isPending, error: removeError, reset } = useDeletePet();
  const [petToRemove, setPetToRemove] = useState<Pet | null>(null);

  function openRemoveDialog(pet: Pet) {
    reset();
    setPetToRemove(pet);
  }

  function closeRemoveDialog() {
    reset();
    setPetToRemove(null);
  }

  function confirmRemove() {
    if (petToRemove === null || isPending) return;
    mutate(petToRemove.petId, {
      onSuccess: () => {
        setPetToRemove(null);
        showSuccess(PET_REMOVED_MESSAGE);
      },
    });
  }

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION}>
        <ButtonLink href={ROUTES.petCreate}>
          <Icon name="plus" />
          Thêm thú cưng
        </ButtonLink>
      </PageHeader>

      {error !== null ? (
        <div>
          <ErrorAlert error={error} />
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              Thử lại
            </Button>
          </div>
        </div>
      ) : data === undefined ? (
        <PetsSkeleton />
      ) : data.items.length === 0 ? (
        <PetsEmptyState />
      ) : (
        <>
          <div className={GRID_CLASS}>
            {data.items.map((pet) => (
              <PetCard key={pet.petId} pet={pet} onRemove={openRemoveDialog} />
            ))}
            <Link
              href={ROUTES.petCreate}
              className="flex min-h-[260px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-line bg-white text-muted transition-colors hover:bg-lagoon-25"
            >
              <span className="grid size-14 place-items-center rounded-[18px] bg-lagoon-50 text-lagoon">
                <Icon name="plus" className="size-6" />
              </span>
              <span className="font-semibold text-ink">Thêm thú cưng</span>
              <span className="text-xs">Chó, mèo, thỏ hoặc chuột lang</span>
            </Link>
          </div>
          <Alert tone="info" className="mt-4">
            Cân nặng của bé thay đổi? Cập nhật hồ sơ để giá tạm tính sát hơn. Cửa hàng vẫn cân lại khi tiếp nhận.
          </Alert>
        </>
      )}

      {petToRemove !== null && (
        <RemovePetDialog
          isRemoving={isPending}
          error={removeError}
          onConfirm={confirmRemove}
          onClose={closeRemoveDialog}
        />
      )}
    </>
  );
}

