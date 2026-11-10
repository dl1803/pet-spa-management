"use client";

// SW-05 Hồ sơ thú cưng của lễ tân – UI-Screens.md. Một màn cho hai đường dẫn: .../thu-cung/them (tạo) và .../thu-cung/[petId] (sửa).

import { skipToken, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerBreadcrumb } from "@/features/reception-customers/components/customer-breadcrumb";
import { PetProfileForm } from "@/features/reception-customers/components/pet-profile-form";
import { ServingCustomerStrip } from "@/features/reception-customers/components/serving-customer-strip";
import { isNotFoundError } from "@/features/reception-customers/forms";
import { mockGetPet, PETS_QUERY_KEY } from "@/features/reception-customers/mock-api";
import { isForbiddenError } from "@/lib/api/errors";
import { ROUTES } from "@/lib/routes";
import { useServingCustomer } from "@/lib/serving-customer";

function PetNotFound() {
  return (
    <EmptyState
      icon="info"
      title="Không tìm thấy thú cưng"
      description="Hồ sơ có thể đã bị gỡ hoặc không thuộc khách đang phục vụ."
      action={
        <ButtonLink href={ROUTES.customers} variant="secondary">
          Về danh sách khách hàng
        </ButtonLink>
      }
    />
  );
}

export function PetProfileScreen() {
  const { customerId, petId } = useParams<{ customerId: string; petId?: string }>();
  const { isReady, customer } = useServingCustomer();
  const editingPetId = typeof petId === "string" ? petId : null;
  const isEditing = editingPetId !== null;
  const {
    data: pet,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [...PETS_QUERY_KEY, "detail", editingPetId],
    queryFn: editingPetId === null ? skipToken : () => mockGetPet(editingPetId),
  });

  // Chưa biết có khách đang phục vụ hay không (máy chủ/hydrate): chưa báo gì để khỏi nhấp nháy.
  if (!isReady) return null;

  // Không có khách đang phục vụ, hoặc đường dẫn thuộc khách khác: quay lại tìm khách (UI-Screens G-14).
  if (customer === null || customer.customerId !== customerId) {
    return (
      <EmptyState
        icon="users"
        title="Chưa chọn khách hàng"
        description="Chọn khách ở màn Khách hàng để thêm hoặc sửa hồ sơ thú cưng."
        action={
          <ButtonLink href={ROUTES.customers} variant="secondary">
            Tìm khách
          </ButtonLink>
        }
      />
    );
  }

  let content: ReactNode;
  if (!isEditing) {
    content = <PetProfileForm customer={customer} />;
  } else if (error) {
    if (isForbiddenError(error)) content = <ForbiddenState />;
    else if (isNotFoundError(error)) content = <PetNotFound />;
    else {
      content = (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={error} />
          <Button variant="secondary" onClick={() => void refetch()} loading={isFetching} loadingText="Đang tải…">
            Thử lại
          </Button>
        </div>
      );
    }
  } else if (pet === undefined) {
    content = (
      <div role="status" aria-label="Đang tải hồ sơ thú cưng" className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  } else if (pet.customerId !== customer.customerId) {
    content = <PetNotFound />;
  } else {
    content = <PetProfileForm key={pet.petId} customer={customer} pet={pet} />;
  }

  return (
    <>
      <CustomerBreadcrumb customerName={customer.fullName} current={isEditing ? (pet?.name ?? "Sửa hồ sơ") : "Thêm thú cưng"} />
      <PageHeader
        title={isEditing ? (pet ? `Sửa hồ sơ ${pet.name}` : "Sửa hồ sơ thú cưng") : "Tạo hồ sơ thú cưng"}
        description="Nhập theo thông tin khách khai tại quầy."
      />
      <ServingCustomerStrip customer={customer} />
      {content}
    </>
  );
}

