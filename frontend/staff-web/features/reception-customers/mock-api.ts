import {
  createMockRecentAppointments,
  type CustomerRecentAppointment,
} from "@/features/reception-customers/mock-data";

// Dữ liệu mô phỏng còn lại của màn Khách hàng: khối “Lịch hẹn gần đây” (GET /appointments?petId=).
// Khối chưa hiển thị vì backend hiện trả 403 cho Lễ tân ở GET /appointments. Khi backend mở phạm vi này cho Lễ tân,
// thay hàm bên dưới bằng hàm trong lib/api/endpoints rồi gỡ tệp này.
export const RECENT_APPOINTMENTS_QUERY_KEY = ["appointments", "recent"] as const;

// Mô phỏng độ trễ mạng khi gọi API.
const MOCK_DELAY_MS = 400;

type MockStore = {
  recentAppointments: CustomerRecentAppointment[];
};

let store: MockStore | null = null;

function createStore(): MockStore {
  return { recentAppointments: createMockRecentAppointments() };
}

function getStore() {
  store ??= createStore();
  return store;
}

export function resetMockCustomerStore() {
  store = createStore();
}

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

// Lấy tối đa 5 lịch hẹn mới nhất của khách hàng theo thời gian giảm dần.
export async function mockListRecentAppointments(customerId: string): Promise<CustomerRecentAppointment[]> {
  await wait();
  return getStore()
    .recentAppointments.filter((item) => item.customerId === customerId)
    .slice()
    .sort((a, b) => {
      const timeA = new Date(a.slotStart ?? a.plannedCheckIn ?? 0).getTime();
      const timeB = new Date(b.slotStart ?? b.plannedCheckIn ?? 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 5)
    .map((item) => ({ ...item }));
}
