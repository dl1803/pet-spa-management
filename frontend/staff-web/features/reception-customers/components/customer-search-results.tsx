"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerCard } from "@/features/reception-customers/components/customer-card";
import { CustomerPetList } from "@/features/reception-customers/components/customer-pet-list";
import { RecentAppointmentsList } from "@/features/reception-customers/components/recent-appointments-list";
import { WalkInSection } from "@/features/reception-customers/components/walk-in-section";
import {
  CUSTOMERS_QUERY_KEY,
  PETS_QUERY_KEY,
  RECENT_APPOINTMENTS_QUERY_KEY,
  mockListCustomers,
  mockListPets,
  mockListRecentAppointments,
} from "@/features/reception-customers/mock-api";
import type { Customer } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";
import { useServingCustomer } from "@/lib/serving-customer";

function CustomerWithPets({ customer }: { customer: Customer }) {
  const { setCustomer } = useServingCustomer();
  const pets = useQuery({
    queryKey: [...PETS_QUERY_KEY, "list", customer.customerId],
    queryFn: () => mockListPets(customer.customerId),
  });
  const recentAppointments = useQuery({
    queryKey: [...RECENT_APPOINTMENTS_QUERY_KEY, customer.customerId],
    queryFn: () => mockListRecentAppointments(customer.customerId),
  });
  const handleSelect = () => setCustomer(customer);

  return (
    <CustomerCard customer={customer} onSelect={handleSelect}>
      {pets.isPending ? (
        <Skeleton className="h-16 w-full" />
      ) : pets.error ? (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={pets.error} />
          <Button variant="secondary" size="sm" onClick={() => void pets.refetch()} loading={pets.isFetching} loadingText="Đang tải…">
            Thử lại
          </Button>
        </div>
      ) : (
        <CustomerPetList customerId={customer.customerId} pets={pets.data} onSelect={handleSelect} />
      )}

      {recentAppointments.isPending ? (
        <div className="mt-5">
          <Skeleton className="h-20 w-full" />
        </div>
      ) : recentAppointments.error ? (
        <div className="mt-5 flex flex-col items-start gap-3">
          <ErrorAlert error={recentAppointments.error} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void recentAppointments.refetch()}
            loading={recentAppointments.isFetching}
            loadingText="Đang tải…"
          >
            Thử lại
          </Button>
        </div>
      ) : (
        <RecentAppointmentsList customerId={customer.customerId} appointments={recentAppointments.data} />
      )}
    </CustomerCard>
  );
}

// SW-04 vùng 2–4: kết quả tìm. Có khách thì hiện thẻ khách; không có thì báo và mở form khách vãng lai.
export function CustomerSearchResults({ search }: { search: string }) {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, "search", search],
    queryFn: () => mockListCustomers(search),
  });

  if (isPending) {
    return (
      <div className="mt-4">
        <Card>
          <CardBody>
            <div role="status" aria-label="Đang tìm khách">
              <Skeleton className="h-14 w-full" />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 flex flex-col items-start gap-3">
        <ErrorAlert error={error} />
        <Button variant="secondary" onClick={() => void refetch()} loading={isFetching} loadingText="Đang tìm…">
          Thử lại
        </Button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="mt-4 flex flex-col gap-4">
        <Alert tone="neutral" icon="search">
          Không tìm thấy khách nào với số <strong>{formatPhone(search)}</strong>. Bạn có thể ghi nhận khách vãng lai bên
          dưới.
        </Alert>
        <WalkInSection initialPhone={search} />
      </div>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-4">
      {data.map((customer) => (
        <li key={customer.customerId}>
          <CustomerWithPets customer={customer} />
        </li>
      ))}
    </ul>
  );
}

