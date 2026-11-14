"use client";

// Màn Hồ sơ thú cưng của lễ tân: một màn cho hai đường dẫn: .../thu-cung/them (tạo) và .../thu-cung/[petId] (sửa).

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerBreadcrumb } from "@/features/reception-customers/components/customer-breadcrumb";
import { PetProfileForm } from "@/features/reception-customers/components/pet-profile-form";
import { ServingCustomerStrip } from "@/features/reception-customers/components/serving-customer-strip";
import { isNotFoundError, isPetEditableFor } from "@/features/reception-customers/forms";
import { isForbiddenError } from "@/lib/api/errors";
import { usePet } from "@/lib/queries/pets";
import { ROUTES, withQuery } from "@/lib/routes";
import { useServingCustomer, type ServingCustomer } from "@/lib/serving-customer";

const SCREEN_DESCRIPTION = "Nhập theo thông tin khách khai tại quầy.";

export function PetNotFoundState({ backHref = ROUTES.customers }: { backHref?: string }) {
  return (
    <Card>
      <EmptyState
        icon="info"
        title="Không tìm thấy thú cưng"
        description="Hồ sơ có thể đã bị gỡ hoặc không thuộc khách đang phục vụ."
        action={
          <ButtonLink href={backHref} variant="secondary">
            Về danh sách khách hàng
          </ButtonLink>
        }
      />
    </Card>
  );
}

export function PetProfileBlockedState({
  isEditing,
  servingCustomer,
}: {
  isEditing: boolean;
  servingCustomer: ServingCustomer | null;
}) {
  const isMismatch = servingCustomer !== null;
  return (
    <>
      <PageHeader title={isEditing ? "Sửa hồ sơ thú cưng" : "Tạo hồ sơ thú cưng"} description={SCREEN_DESCRIPTION} />
      <Card>
        <EmptyState
          icon="users"
          title={isMismatch ? "Không khớp khách đang phục vụ" : "Chưa chọn khách hàng"}
          description={
            isMismatch
              ? `Bạn đang phục vụ khách ${servingCustomer.fullName}. Hãy tìm và chọn đúng khách ở màn Khách hàng.`
              : "Chọn khách ở màn Khách hàng để thêm hoặc sửa hồ sơ thú cưng."
          }
          action={
            <ButtonLink href={ROUTES.customers} variant="secondary">
              Tìm khách
            </ButtonLink>
          }
        />
      </Card>
    </>
  );
}

type PetProfileFallbackProps = {
  error: unknown;
  isFetching: boolean;
  backHref: string;
  onRetry: () => void;
};

export function PetProfileFallback({ error, isFetching, backHref, onRetry }: PetProfileFallbackProps) {
  if (error) {
    if (isForbiddenError(error)) return <ForbiddenState />;
    if (isNotFoundError(error)) return <PetNotFoundState backHref={backHref} />;
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={error} />
        <Button variant="secondary" onClick={onRetry} loading={isFetching} loadingText="Đang tải…">
          Thử lại
        </Button>
      </div>
    );
  }
  return (
    <div role="status" aria-label="Đang tải hồ sơ thú cưng" className="flex flex-col gap-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function PetProfileScreen() {
  const { customerId, petId } = useParams<{ customerId: string; petId?: string }>();
  const { isReady, customer } = useServingCustomer();
  const editingPetId = typeof petId === "string" ? petId : null;
  const isEditing = editingPetId !== null;
  // Chỉ tải chi tiết thú cưng sau khi đã xác nhận đúng khách đang phục vụ trên URL.
  const targetPetId = isReady && customer !== null && customer.customerId === customerId ? editingPetId : null;
  const { data: pet, error, isFetching, refetch } = usePet(targetPetId);

  // Chưa biết có khách đang phục vụ hay không (máy chủ/hydrate): chưa báo gì để khỏi nhấp nháy.
  if (!isReady) return null;

  // Không có khách đang phục vụ, hoặc đường dẫn thuộc khách khác: quay lại tìm khách.
  if (customer === null || customer.customerId !== customerId) {
    return <PetProfileBlockedState isEditing={isEditing} servingCustomer={customer} />;
  }

  const backToCustomerHref = withQuery(ROUTES.customers, { search: customer.phone });
  // Hồ sơ đã gỡ hoặc của khách khác không được hiện tên ở tiêu đề hay breadcrumb.
  const editablePet = pet !== undefined && isPetEditableFor(pet, customer.customerId) ? pet : undefined;

  let content: ReactNode;
  if (!isEditing) {
    content = <PetProfileForm customer={customer} cancelHref={backToCustomerHref} />;
  } else if (error || pet === undefined) {
    content = (
      <PetProfileFallback
        error={error}
        isFetching={isFetching}
        backHref={backToCustomerHref}
        onRetry={() => void refetch()}
      />
    );
  } else if (editablePet === undefined) {
    content = <PetNotFoundState backHref={backToCustomerHref} />;
  } else {
    content = (
      <PetProfileForm key={editablePet.petId} customer={customer} pet={editablePet} cancelHref={backToCustomerHref} />
    );
  }

  return (
    <>
      <CustomerBreadcrumb
        customerName={customer.fullName}
        current={isEditing ? (editablePet?.name ?? "Sửa hồ sơ") : "Thêm thú cưng"}
        customersHref={backToCustomerHref}
      />
      <PageHeader
        title={isEditing ? (editablePet ? `Sửa hồ sơ ${editablePet.name}` : "Sửa hồ sơ thú cưng") : "Tạo hồ sơ thú cưng"}
        description={SCREEN_DESCRIPTION}
      />
      <ServingCustomerStrip customer={customer} />
      {content}
    </>
  );
}

