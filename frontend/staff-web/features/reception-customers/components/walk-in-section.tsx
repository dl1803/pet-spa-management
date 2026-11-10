"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useToast } from "@/components/feedback/toast";
import { DuplicateCustomerCard } from "@/features/reception-customers/components/duplicate-customer-card";
import { WalkInForm } from "@/features/reception-customers/components/walk-in-form";
import {
  DUPLICATE_CONTACT_MESSAGE,
  isDuplicateContactError,
  toWalkInRequest,
  walkInSavedMessage,
  type WalkInFormValues,
} from "@/features/reception-customers/forms";
import { CUSTOMERS_QUERY_KEY, mockCreateWalkInCustomer, mockListCustomers } from "@/features/reception-customers/mock-api";
import type { Customer } from "@/lib/api/types";
import { ROUTES, withQuery } from "@/lib/routes";
import { useServingCustomer } from "@/lib/serving-customer";
import { normalizePhone, validateFullName, validatePhone } from "@/lib/validation";

// SW-04 vùng 4: ghi nhận khách vãng lai. Lưu xong đặt khách làm khách đang phục vụ rồi sang SW-05 để tạo hồ sơ thú cưng.
export function WalkInSection({ initialPhone }: { initialPhone: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const { setCustomer } = useServingCustomer();
  // Số điện thoại vừa bị từ chối vì trùng liên hệ (409); null khi chưa gặp lỗi này.
  const [duplicatePhone, setDuplicatePhone] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<WalkInFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: { fullName: "", phone: initialPhone },
  });
  const phone = useWatch({ control, name: "phone" });
  // Sửa số điện thoại khác số bị từ chối thì mở lại nút lưu.
  const isDuplicate = duplicatePhone !== null && normalizePhone(phone) === duplicatePhone;

  const createWalkIn = useMutation({ mutationFn: mockCreateWalkInCustomer });
  const duplicateSearch = useQuery({
    queryKey: [...CUSTOMERS_QUERY_KEY, "search", duplicatePhone],
    queryFn: duplicatePhone === null ? skipToken : () => mockListCustomers(duplicatePhone),
  });
  const duplicateCustomer = isDuplicate
    ? duplicateSearch.data?.find((customer) => customer.phone === duplicatePhone)
    : undefined;

  function onSubmit(values: WalkInFormValues) {
    if (createWalkIn.isPending || isDuplicate) return;
    createWalkIn.mutate(toWalkInRequest(values), {
      onSuccess: ({ customerId }, request) => {
        void queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
        setCustomer({ customerId, fullName: request.fullName, phone: request.phone, isBookingLocked: false });
        showSuccess(walkInSavedMessage(request.fullName));
        router.push(ROUTES.customerPetNew(customerId));
      },
      onError: (error, request) => {
        if (!isDuplicateContactError(error)) return;
        setDuplicatePhone(request.phone);
        setError("phone", { type: "server", message: DUPLICATE_CONTACT_MESSAGE });
      },
    });
  }

  function handleSelectDuplicate(customer: Customer) {
    setCustomer(customer);
    void queryClient.invalidateQueries({ queryKey: CUSTOMERS_QUERY_KEY });
    router.replace(withQuery(ROUTES.customers, { search: customer.phone }), { scroll: false });
  }

  return (
    <WalkInForm
      fullName={register("fullName", { validate: validateFullName })}
      phone={register("phone", { validate: validatePhone })}
      errors={{ fullName: errors.fullName?.message, phone: errors.phone?.message }}
      submitError={createWalkIn.error && !isDuplicateContactError(createWalkIn.error) ? createWalkIn.error : null}
      isSubmitting={createWalkIn.isPending}
      isDuplicate={isDuplicate}
      onSubmit={handleSubmit(onSubmit)}
      onCancel={() => router.replace(ROUTES.customers, { scroll: false })}
      duplicate={
        duplicateCustomer && (
          <DuplicateCustomerCard customer={duplicateCustomer} onSelect={() => handleSelectDuplicate(duplicateCustomer)} />
        )
      }
    />
  );
}

