import type { CounterPaymentMethod, CounterPaymentRequest } from "@/lib/api/types";

// Thứ tự hiển thị phương thức ghi nhận tại quầy (UI-Screens SW-09 vùng 5).
export const COUNTER_METHOD_ORDER: CounterPaymentMethod[] = ["Cash", "BankQR"];

export const FORM_MESSAGES = {
  receivedAmountRequired: "Vui lòng nhập số tiền thực nhận.",
  receivedAmountInvalid: "Số tiền thực nhận phải là số nguyên, ví dụ 250.000 hoặc 250,000.",
  // Câu của UI-Screens SW-09 vùng 6 và của 409 AMOUNT_MISMATCH.
  receivedAmountInsufficient: "Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.",
} as const;

// Giới hạn theo DB: ReceivedAmount numeric(12,0).
const AMOUNT_MAX_DIGITS = 12;

const AMOUNT_FORMAT = new Intl.NumberFormat("vi-VN");

export type CounterFormValues = {
  method: CounterPaymentMethod;
  // Chuỗi người nhập, ví dụ “250.000”.
  receivedAmount: string;
  // Ô “Đã kiểm tra tiền vào tài khoản cửa hàng”, chỉ có ý nghĩa với chuyển khoản QR.
  bankConfirmed: boolean;
};

export function isCounterMethod(value: string): value is CounterPaymentMethod {
  return COUNTER_METHOD_ORDER.some((method) => method === value);
}

export function parseMoneyInput(text: string): number | null {
  const amount = text.trim();
  // Chỉ bỏ dấu phân nhóm khi từng nhóm có đúng ba chữ số để tránh đổi số thập phân thành số nguyên khác.
  if (!/^(?:\d+|\d{1,3}([.,\s])\d{3}(?:\1\d{3})*)$/.test(amount)) return null;
  const digits = amount.replace(/[.,\s]/g, "");
  if (digits.length > AMOUNT_MAX_DIGITS) return null;
  return Number(digits);
}

// Mặc định: tiền mặt, số tiền nhận bằng số tiền phải trả, chưa tích ô kiểm tra tiền vào tài khoản.
export function createCounterFormValues(amount: number): CounterFormValues {
  return { method: "Cash", receivedAmount: AMOUNT_FORMAT.format(amount), bankConfirmed: false };
}

// Số tiền thực nhận ≥ số tiền phải trả (BR-17); backend vẫn kiểm tra lại.
export function validateReceivedAmount(amount: number) {
  return (value: string): true | string => {
    if (value.trim() === "") return FORM_MESSAGES.receivedAmountRequired;
    const received = parseMoneyInput(value);
    if (received === null) return FORM_MESSAGES.receivedAmountInvalid;
    return received >= amount || FORM_MESSAGES.receivedAmountInsufficient;
  };
}

export type CounterFormState = {
  received: number | null;
  // Tiền thối lại; chỉ có nghĩa khi đã nhận đủ.
  change: number;
  // Số còn thiếu; 0 khi đã đủ hoặc chưa nhập số hợp lệ.
  shortfall: number;
  isInsufficient: boolean;
  // Khóa nút xác nhận: thiếu tiền, hoặc chuyển khoản QR mà chưa tích ô kiểm tra tiền vào tài khoản.
  isLocked: boolean;
};

export function getCounterFormState(values: CounterFormValues, amount: number): CounterFormState {
  const received = parseMoneyInput(values.receivedAmount);
  const isInsufficient = received !== null && received < amount;
  const isPaidInFull = received !== null && received >= amount;
  return {
    received,
    change: isPaidInFull ? received - amount : 0,
    shortfall: received !== null && isInsufficient ? amount - received : 0,
    isInsufficient,
    isLocked: isInsufficient || (values.method === "BankQR" && !values.bankConfirmed),
  };
}

// Chỉ gọi sau khi validateReceivedAmount trả true. Không gửi `amount`: backend tự tính (FR-PAY-01).
export function toCounterPaymentRequest(values: CounterFormValues): CounterPaymentRequest {
  const receivedAmount = parseMoneyInput(values.receivedAmount);
  if (receivedAmount === null) throw new Error("Số tiền thực nhận chưa hợp lệ.");
  return { method: values.method, receivedAmount };
}
