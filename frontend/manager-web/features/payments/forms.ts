import type { CounterPaymentMethod, CounterPaymentRequest } from "@/lib/api/types";

// Thứ tự hiển thị phương thức ghi nhận tại quầy, theo UI demo (MW-10·D1).
export const COUNTER_METHOD_ORDER: CounterPaymentMethod[] = ["Cash", "BankQR"];

export const FORM_MESSAGES = {
  receivedAmountRequired: "Vui lòng nhập số tiền thực nhận.",
  receivedAmountInvalid: "Số tiền thực nhận chỉ gồm chữ số, ví dụ 250.000.",
  // Cũng là câu của 409 AMOUNT_MISMATCH hiện dưới ô số tiền (Frontend-Conventions 5.2, SA 6.6).
  receivedAmountInsufficient: "Số tiền chưa đủ, chưa thể ghi nhận đã thanh toán.",
} as const;

// Giới hạn theo DB: ReceivedAmount numeric(12,0) (DatabaseDesign, bảng Payment).
const AMOUNT_MAX_DIGITS = 12;

const AMOUNT_FORMAT = new Intl.NumberFormat("vi-VN");

export type CounterFormValues = {
  method: CounterPaymentMethod;
  // Chuỗi người nhập, ví dụ “250.000”.
  receivedAmount: string;
};

export function isCounterMethod(value: string): value is CounterPaymentMethod {
  return COUNTER_METHOD_ORDER.some((method) => method === value);
}

// “250.000” hoặc “250000” → 250000; có ký tự khác chữ số hoặc quá 12 chữ số → null.
export function parseMoneyInput(text: string): number | null {
  const digits = text.replace(/[\s.]/g, "");
  if (!/^\d+$/.test(digits) || digits.length > AMOUNT_MAX_DIGITS) return null;
  return Number(digits);
}

// Mặc định như UI demo: tiền mặt, số tiền thực nhận bằng số tiền phải trả.
export function createCounterFormValues(amount: number): CounterFormValues {
  return { method: "Cash", receivedAmount: AMOUNT_FORMAT.format(amount) };
}

// Số tiền thực nhận ≥ số tiền phải trả (BR-17); backend vẫn kiểm tra lại (409 AMOUNT_MISMATCH).
export function validateReceivedAmount(amount: number) {
  return (value: string): true | string => {
    if (value.trim() === "") return FORM_MESSAGES.receivedAmountRequired;
    const received = parseMoneyInput(value);
    if (received === null) return FORM_MESSAGES.receivedAmountInvalid;
    return received >= amount || FORM_MESSAGES.receivedAmountInsufficient;
  };
}

// Chỉ gọi sau khi validateReceivedAmount trả true. Không gửi `amount` (Frontend-Conventions 4.1): backend tự tính.
export function toCounterPaymentRequest(values: CounterFormValues): CounterPaymentRequest {
  const receivedAmount = parseMoneyInput(values.receivedAmount);
  if (receivedAmount === null) throw new Error("Số tiền thực nhận chưa hợp lệ.");
  return { method: values.method, receivedAmount };
}
