import type { AppointmentDetail, Payment, PaymentKind, Species } from "@/lib/api/types";
import { addDaysToDateKey, buildStoreDateTime, getStoreDateKey } from "@/lib/time";
import type { CounterPaymentRow, HotelRate, PricedService } from "@/features/reception-payments/payment";

// Dữ liệu mô phỏng cho màn Thanh toán tại quầy; chưa gọi API.
// Mã hiển thị “LH-…” lấy 8 ký tự đầu của ID nên 8 ký tự đầu của mỗi appointmentId phải khác nhau.
export const MOCK_CONFIRMER_NAME = "Thu Hà";

type MockInput = {
  n: number;
  kind: PaymentKind;
  amount: number;
  petName: string;
  species: Species;
  customerName: string;
  appointment: Pick<AppointmentDetail, "type" | "status" | "sizeGroup"> & Partial<AppointmentDetail>;
  hotelRate?: HotelRate;
  services?: PricedService[];
  completedAt?: string;
};

const id = (prefix: string, n: number) => `${prefix}2800${String(n).padStart(3, "0")}-0000-4000-8000-000000000001`;

function buildRow(createdAt: string, input: MockInput): CounterPaymentRow {
  const appointment: AppointmentDetail = {
    appointmentId: id("a", input.n),
    customerId: id("c", input.n),
    petId: id("b", input.n),
    customerName: input.customerName,
    petName: input.petName,
    createdAt,
    updatedAt: createdAt,
    ...input.appointment,
  };
  const payment: Payment = {
    paymentId: id("e", input.n),
    appointmentId: appointment.appointmentId,
    kind: input.kind,
    amount: input.amount,
    status: "Unpaid",
    method: null,
    receivedAmount: null,
    paidAt: null,
  };
  return {
    payment,
    appointment,
    species: input.species,
    hotelRate: input.hotelRate ?? null,
    services: input.services ?? [],
    completedAt: input.completedAt ?? null,
  };
}

// Bốn khoản chưa thu: hai tiền lưu trú, một phí trả muộn, một khoản spa.
export function createMockPaymentRows(now: Date): CounterPaymentRow[] {
  const today = getStoreDateKey(now);
  const yesterday = addDaysToDateKey(today, -1);
  const at = (dateKey: string, time: string) => buildStoreDateTime(dateKey, time);
  const createdAt = at(addDaysToDateKey(today, -3), "09:00");

  return [
    buildRow(createdAt, {
      n: 1,
      kind: "Stay",
      amount: 250_000,
      petName: "Cốm",
      species: "Rabbit",
      customerName: "Phạm Quốc Huy",
      hotelRate: { pricePerNight: 100_000, foodPerNight: 25_000 },
      appointment: {
        type: "Hotel",
        status: "Confirmed",
        sizeGroup: "Small",
        actualWeightKg: 1.45,
        plannedCheckIn: at(today, "10:00"),
        plannedCheckOut: at(addDaysToDateKey(today, 2), "10:00"),
      },
    }),
    buildRow(createdAt, {
      n: 2,
      kind: "Stay",
      amount: 440_000,
      petName: "Bông",
      species: "Dog",
      customerName: "Nguyễn Thị Mai",
      hotelRate: { pricePerNight: 150_000, foodPerNight: 70_000 },
      appointment: {
        type: "Hotel",
        status: "Confirmed",
        sizeGroup: "Medium",
        actualWeightKg: 12.5,
        plannedCheckIn: at(yesterday, "08:00"),
        plannedCheckOut: at(addDaysToDateKey(today, 1), "08:00"),
      },
    }),
    buildRow(createdAt, {
      n: 3,
      kind: "LateFee",
      amount: 100_000,
      petName: "Mướp",
      species: "Cat",
      customerName: "Lê Hoàng Nam",
      appointment: {
        type: "Hotel",
        status: "InStay",
        sizeGroup: "Small",
        actualWeightKg: 4.1,
        plannedCheckIn: at(addDaysToDateKey(today, -3), "14:00"),
        plannedCheckOut: at(today, "10:00"),
        actualCheckOut: at(today, "11:40"),
      },
    }),
    buildRow(createdAt, {
      n: 4,
      kind: "Spa",
      amount: 270_000,
      petName: "Gạo",
      species: "Dog",
      customerName: "Trần Thu Trang",
      services: [
        { name: "Tắm và sấy", price: 150_000 },
        { name: "Cắt tỉa lông", price: 120_000 },
      ],
      completedAt: at(today, "09:30"),
      appointment: {
        type: "Spa",
        status: "Completed",
        sizeGroup: "Small",
        actualWeightKg: 4.2,
        slotStart: at(today, "08:00"),
        slotEnd: at(today, "10:00"),
      },
    }),
  ];
}
