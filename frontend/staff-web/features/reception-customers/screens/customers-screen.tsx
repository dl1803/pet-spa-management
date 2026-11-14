"use client";

// Màn Khách hàng: từ khóa tìm nằm trên URL (?search=) để tải lại trang vẫn giữ kết quả.

import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerSearchForm } from "@/features/reception-customers/components/customer-search-form";
import { CustomerSearchResults } from "@/features/reception-customers/components/customer-search-results";
import { validateSearchTerm, type SearchFormValues } from "@/features/reception-customers/forms";
import { customerKeys } from "@/lib/queries/customers";
import { ROUTES, withQuery } from "@/lib/routes";
import { normalizePhone } from "@/lib/validation";

type SearchBoxProps = {
  search: string;
  isSearching: boolean;
  onSearch: (term: string) => void;
};

function SearchBox({ search, isSearching, onSearch }: SearchBoxProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldFocusError: true,
    // `values` đồng bộ lại ô nhập khi từ khóa trên URL đổi (ví dụ bấm “Hủy bỏ”).
    values: { search },
  });

  return (
    <CustomerSearchForm
      registration={register("search", { validate: validateSearchTerm })}
      error={errors.search?.message}
      isSearching={isSearching}
      onSubmit={handleSubmit((values) => onSearch(normalizePhone(values.search)))}
    />
  );
}

export function CustomersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const search = (useSearchParams().get("search") ?? "").trim();
  const searchQueryKey = customerKeys.search(search);
  const isSearching = useIsFetching({ queryKey: searchQueryKey }) > 0;

  function handleSearch(term: string) {
    if (term === search) {
      // Tìm lại đúng từ khóa đang xem: tải lại kết quả.
      void queryClient.invalidateQueries({ queryKey: searchQueryKey });
      return;
    }
    router.replace(withQuery(ROUTES.customers, { search: term }), { scroll: false });
  }

  return (
    <>
      <PageHeader title="Khách hàng" description="Tìm theo số điện thoại trước khi ghi nhận khách mới." />
      <SearchBox search={search} isSearching={isSearching} onSearch={handleSearch} />
      {search !== "" && <CustomerSearchResults key={search} search={search} />}
    </>
  );
}

