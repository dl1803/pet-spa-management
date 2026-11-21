"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { HotelBookingPanel } from "@/features/reception-booking/components/hotel-booking-panel";
import { ServingCustomerBar } from "@/features/reception-booking/components/serving-customer-bar";
import { SpaBookingPanel } from "@/features/reception-booking/components/spa-booking-panel";
import { parseBookingType, type BookingType } from "@/features/reception-booking/forms";
import { usePets } from "@/lib/queries/pets";
import { ROUTES, withQuery } from "@/lib/routes";
import { useServingCustomer, type ServingCustomer } from "@/lib/serving-customer";

const TITLE = "Đặt lịch thay khách";
const DESCRIPTION = "Dùng khi khách đến quầy hoặc gọi điện. Không áp dụng khóa tự đặt lịch.";

const BOOKING_TABS: { value: BookingType; label: string }[] = [
  { value: "Spa", label: "Lịch spa" },
  { value: "Hotel", label: "Lưu trú" },
];

export function ReceptionBookingScreen() {
  const searchParams = useSearchParams();
  const { isReady, customer } = useServingCustomer();
  const requestedCustomerId = searchParams.get("customerId");

  if (!isReady) return <PageHeader title={TITLE} description={DESCRIPTION} />;

  if (customer === null || (requestedCustomerId !== null && requestedCustomerId !== customer.customerId)) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <Card>
          <EmptyState
            icon="users"
            title="Chưa chọn khách hàng"
            description="Chọn khách ở màn Khách hàng để đặt lịch thay."
            action={<ButtonLink href={ROUTES.customers}>Tìm khách</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <BookingContent
        key={customer.customerId}
        customer={customer}
        type={parseBookingType(searchParams.get("type"))}
        requestedPetId={searchParams.get("petId")}
      />
    </>
  );
}

function BookingSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Đang tải thú cưng…</span>
      <Card>
        <CardBody>
          <Skeleton className="h-6 w-40 rounded-[10px]" />
          <Skeleton className="mt-4 h-16 rounded-xl" />
        </CardBody>
      </Card>
    </div>
  );
}

type BookingContentProps = {
  customer: ServingCustomer;
  type: BookingType;
  requestedPetId: string | null;
};

function BookingContent({ customer, type, requestedPetId }: BookingContentProps) {
  const router = useRouter();
  const petsQuery = usePets(customer.customerId);
  const [pickedPetId, setPickedPetId] = useState<string | null>(null);
  const pets = petsQuery.data?.items;

  if (pets === undefined) {
    return (
      <>
        <ServingCustomerBar customer={customer} />
        {petsQuery.error !== null ? (
          <div className="flex flex-col items-start gap-4">
            <ErrorAlert error={petsQuery.error} className="w-full" />
            <Button
              variant="secondary"
              onClick={() => void petsQuery.refetch()}
              loading={petsQuery.isFetching}
              loadingText="Đang tải…"
            >
              Thử lại
            </Button>
          </div>
        ) : (
          <BookingSkeleton />
        )}
      </>
    );
  }

  const pet = pets.find((item) => item.petId === (pickedPetId ?? requestedPetId)) ?? pets[0] ?? null;

  function handlePetSelect(nextPetId: string) {
    setPickedPetId(nextPetId);
    router.replace(withQuery(ROUTES.booking, { customerId: customer.customerId, petId: nextPetId, type }), {
      scroll: false,
    });
  }

  function handleTypeChange(next: BookingType) {
    router.replace(withQuery(ROUTES.booking, { customerId: customer.customerId, petId: pet?.petId, type: next }), {
      scroll: false,
    });
  }

  return (
    <>
      <ServingCustomerBar customer={customer} />
      <Tabs label="Loại lịch" items={BOOKING_TABS} value={type} onChange={handleTypeChange} />
      {pet === null ? (
        <Card>
          <EmptyState
            icon="user"
            title="Khách chưa có thú cưng"
            description="Cần tạo hồ sơ thú cưng cho khách trước khi đặt lịch."
            action={
              <ButtonLink href={ROUTES.customerPetNew(customer.customerId)} variant="secondary">
                <Icon name="plus" className="size-3.5" />
                Thêm thú cưng
              </ButtonLink>
            }
          />
        </Card>
      ) : type === "Spa" ? (
        <SpaBookingPanel key={pet.petId} customer={customer} pets={pets} pet={pet} onPetSelect={handlePetSelect} />
      ) : (
        <HotelBookingPanel key={pet.petId} customer={customer} pets={pets} pet={pet} onPetSelect={handlePetSelect} />
      )}
    </>
  );
}
