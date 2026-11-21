"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/feedback/alert";
import { useToast } from "@/components/feedback/toast";
import type { Customer } from "@/lib/api/types";
import { LockedCustomerTable } from "../components/locked-customer-table";
import { UnlockBookingDialog } from "../components/unlock-booking-dialog";
import { LOCKED_CUSTOMER_MESSAGES } from "../list";
import { MOCK_LOCKED_CUSTOMERS, unlockMockCustomer } from "../mock-data";

// MW-09 – Khách hàng bị khóa tự đặt lịch. Dữ liệu mô phỏng giữ trong state của màn hình; thay bằng TanStack Query khi nối API.
export function LockedCustomersScreen() {
  const { showError, showSuccess } = useToast();
  const [customers, setCustomers] = useState<Customer[]>(MOCK_LOCKED_CUSTOMERS);
  const [unlocking, setUnlocking] = useState<Customer | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  function handleConfirm() {
    if (!unlocking) return;
    const target = unlocking;
    setUnlocking(null);
    // unlockMockCustomer ném ApiError 409 CUSTOMER_NOT_LOCKED như API thật: toast lỗi (Frontend-Conventions 5.2), dòng dưới không chạy.
    try {
      setCustomers(unlockMockCustomer(customers, target.customerId));
      showSuccess(LOCKED_CUSTOMER_MESSAGES.success);
    } catch (error) {
      showError(error);
    }
    // Nút đã mở hộp thoại có thể đã biến mất cùng dòng khách: trả focus về tiêu đề.
    headingRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 ref={headingRef} tabIndex={-1}>{LOCKED_CUSTOMER_MESSAGES.title}</h1>
        <p className="mt-1 text-muted">{LOCKED_CUSTOMER_MESSAGES.subtitle}</p>
      </header>
      <LockedCustomerTable customers={customers} onUnlock={setUnlocking} />
      <Alert tone="neutral" icon="info">{LOCKED_CUSTOMER_MESSAGES.note}</Alert>
      {unlocking && (
        <UnlockBookingDialog customer={unlocking} onConfirm={handleConfirm} onCancel={() => setUnlocking(null)} />
      )}
    </div>
  );
}
