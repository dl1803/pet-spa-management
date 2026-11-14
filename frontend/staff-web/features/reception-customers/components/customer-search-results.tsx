"use client";

import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerCard } from "@/features/reception-customers/components/customer-card";
import { CustomerPetList } from "@/features/reception-customers/components/customer-pet-list";
import { WalkInSection } from "@/features/reception-customers/components/walk-in-section";
import { describeTruncatedCustomers } from "@/features/reception-customers/forms";
import { isForbiddenError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";
import { useCustomerSearch } from "@/lib/queries/customers";
import { usePets } from "@/lib/queries/pets";
import { useServingCustomer } from "@/lib/serving-customer";

function CustomerWithPets({ customer }: { customer: Customer }) {
  const { setCustomer } = useServingCustomer();
  const pets = usePets(customer.customerId);
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
        <CustomerPetList customerId={customer.customerId} pets={pets.data.items} onSelect={handleSelect} />
      )}
    </CustomerCard>
  );
}

// Kết quả tìm kiếm: có khách thì hiện thẻ khách; không có thì báo và mở form khách vãng lai.
export function CustomerSearchResults({ search }: { search: string }) {
  const { data, error, isPending, isFetching, refetch } = useCustomerSearch(search);

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
    if (isForbiddenError(error)) {
      return (
        <div className="mt-4">
          <ForbiddenState />
        </div>
      );
    }
    return (
      <div className="mt-4 flex flex-col items-start gap-3">
        <ErrorAlert error={error} />
        <Button variant="secondary" onClick={() => void refetch()} loading={isFetching} loadingText="Đang tìm…">
          Thử lại
        </Button>
      </div>
    );
  }

  if (data.items.length === 0) {
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

  const truncatedNote = describeTruncatedCustomers(data.total, data.items.length);

  return (
    <div className="mt-4 flex flex-col gap-4">
      {truncatedNote !== null && (
        <Alert tone="neutral" icon="info">
          {truncatedNote}
        </Alert>
      )}
      <ul className="flex flex-col gap-4">
        {data.items.map((customer) => (
          <li key={customer.customerId}>
            <CustomerWithPets customer={customer} />
          </li>
        ))}
      </ul>
    </div>
  );
}
