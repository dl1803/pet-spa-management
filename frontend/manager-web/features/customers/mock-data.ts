import { ApiError } from "@/lib/api/errors";
import type { Customer } from "@/lib/api/types";
import { LOCKED_CUSTOMER_MESSAGES } from "./list";

// Dữ liệu mô phỏng theo UI demo (MW-09), đúng hình dạng Customer của GET /customers (QL chỉ nhận khách bị khóa).
// Thay bằng dữ liệu API thật khi backend sẵn sàng.
export const MOCK_LOCKED_CUSTOMERS: Customer[] = [
  { customerId: "8b1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f61", fullName: "Hoàng Thị Mai", phone: "0908112456", email: null, isBookingLocked: true },
  { customerId: "8b1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f62", fullName: "Bùi Đức Long", phone: "0931908776", email: null, isBookingLocked: true },
];

// Mô phỏng POST /customers/{id}/unlock-booking: khách không còn trong danh sách bị khóa thì 409 CUSTOMER_NOT_LOCKED
// (openapi unlockBooking). Trả danh sách mới, không sửa danh sách đầu vào.
export function unlockMockCustomer(current: Customer[], customerId: string): Customer[] {
  if (!current.some((customer) => customer.customerId === customerId)) {
    throw new ApiError({
      kind: "http",
      status: 409,
      code: "CUSTOMER_NOT_LOCKED",
      title: LOCKED_CUSTOMER_MESSAGES.notLocked,
      detail: LOCKED_CUSTOMER_MESSAGES.notLocked,
    });
  }
  return current.filter((customer) => customer.customerId !== customerId);
}
