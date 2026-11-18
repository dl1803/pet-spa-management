import type { InStayRef } from "@/features/reception-cages/cages";
import { createMockCages, createMockInStayRefs } from "@/features/reception-cages/mock-data";
import type { Cage } from "@/lib/api/types";

// Mô phỏng độ trễ mạng khi gọi API.
const MOCK_DELAY_MS = 500;

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// Thay cho GET /cages: trả toàn bộ chuồng, dữ liệu dựng lại mỗi lần gọi theo thời điểm hiện tại.
export async function mockListCages(): Promise<Cage[]> {
  await wait();
  return createMockCages(new Date());
}

// Thay cho GET /appointments?date=<hôm nay>&type=Hotel&status=InStay.
export async function mockListInStayRefs(): Promise<InStayRef[]> {
  await wait();
  return createMockInStayRefs();
}
