import { skipToken, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createWalkInCustomer, listCustomers } from "@/lib/api/endpoints/customers";

// Mỗi lần tìm chỉ lấy trang đầu; giao diện báo khi còn khách khớp chưa hiển thị.
export const CUSTOMER_SEARCH_PAGE_SIZE = 20;

export const customerKeys = {
  all: ["customers"] as const,
  search: (search: string | null) => ["customers", "search", search] as const,
};

// Đợi làm mới cả các query đang ẩn trước khi chuyển trang.
export function invalidateCustomers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: customerKeys.all, refetchType: "all" });
}

// search = null: chưa tìm (không gọi API).
export function useCustomerSearch(search: string | null) {
  const term = search;
  return useQuery({
    queryKey: customerKeys.search(term),
    queryFn: term === null ? skipToken : () => listCustomers({ search: term, page: 1, pageSize: CUSTOMER_SEARCH_PAGE_SIZE }),
  });
}

export function useCreateWalkInCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWalkInCustomer,
    onSuccess: () => invalidateCustomers(queryClient),
  });
}
