"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Customer } from "@/lib/api/types";

// Khách mà lễ tân đang phục vụ, giữ trong phiên làm việc của tab để các màn Khách hàng, Hồ sơ thú cưng
// và Đặt lịch thay dùng chung (API chưa có GET /customers/{id} – UI-Screens G-14).
// Chỉ chứa thông tin để hiển thị, không chứa token (Frontend-Architecture mục 5).
export const SERVING_CUSTOMER_STORAGE_KEY = "ps.servingCustomer";

export type ServingCustomer = Pick<Customer, "customerId" | "fullName" | "phone" | "isBookingLocked">;

export function parseServingCustomer(raw: string | null): ServingCustomer | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const { customerId, fullName, phone, isBookingLocked } = value as Record<string, unknown>;
  if (typeof customerId !== "string" || customerId === "") return null;
  if (typeof fullName !== "string" || typeof phone !== "string") return null;
  if (typeof isBookingLocked !== "boolean") return null;
  return { customerId, fullName, phone, isBookingLocked };
}

export function serializeServingCustomer(customer: ServingCustomer): string {
  const { customerId, fullName, phone, isBookingLocked } = customer;
  return JSON.stringify({ customerId, fullName, phone, isBookingLocked });
}

// Dự phòng trong bộ nhớ chỉ dùng khi trình duyệt chặn sessionStorage.
let memoryRaw: string | null = null;
const listeners = new Set<() => void>();

function readStoredRaw(): string | null {
  try {
    return window.sessionStorage.getItem(SERVING_CUSTOMER_STORAGE_KEY);
  } catch {
    return memoryRaw;
  }
}

function writeStoredRaw(raw: string | null) {
  memoryRaw = raw;
  try {
    if (raw === null) window.sessionStorage.removeItem(SERVING_CUSTOMER_STORAGE_KEY);
    else window.sessionStorage.setItem(SERVING_CUSTOMER_STORAGE_KEY, raw);
  } catch {
    // Chỉ mất khả năng giữ khách khi tải lại trang.
  }
}

function setRaw(raw: string | null) {
  writeStoredRaw(raw);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return readStoredRaw();
}

function getServerSnapshot() {
  return null;
}

function subscribeNever() {
  return () => {};
}

type ServingCustomerContextValue = {
  // false khi render trên máy chủ và lúc hydrate: chưa biết có khách hay chưa, màn không nên báo “chưa chọn khách”.
  isReady: boolean;
  customer: ServingCustomer | null;
  setCustomer: (customer: ServingCustomer) => void;
  clearCustomer: () => void;
};

const ServingCustomerContext = createContext<ServingCustomerContextValue | null>(null);

export function ServingCustomerProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isReady = useSyncExternalStore(subscribeNever, () => true, () => false);
  const customer = useMemo(() => parseServingCustomer(raw), [raw]);
  const setCustomer = useCallback((next: ServingCustomer) => setRaw(serializeServingCustomer(next)), []);
  const clearCustomer = useCallback(() => setRaw(null), []);
  const value = useMemo(
    () => ({ isReady, customer, setCustomer, clearCustomer }),
    [isReady, customer, setCustomer, clearCustomer],
  );

  return <ServingCustomerContext.Provider value={value}>{children}</ServingCustomerContext.Provider>;
}

export function useServingCustomer() {
  const value = useContext(ServingCustomerContext);
  if (value === null) throw new Error("useServingCustomer phải nằm trong ServingCustomerProvider.");
  return value;
}

