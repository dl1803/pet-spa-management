// lib/mock-shop-day.ts
import type { AppointmentDetail, Cage, Payment, Photo, Species, Staff, WorkShift } from "@/lib/api/types";

// Dữ liệu mô phỏng một ngày của cửa hàng theo UI demo (MW-02, MW-05): “hôm nay” là thứ ba 06/10/2026, 09:20 (UI-Screens mục 1).
// Đúng hình dạng các schema của openapi.yaml (Appointment/AppointmentDetail, Staff, WorkShift, Cage, Payment, Photo).
// Mã hiển thị “LH-…” lấy 8 ký tự đầu của appointmentId nên 8 ký tự đầu của mỗi appointmentId phải khác nhau.
// Dùng chung cho MW-02 và MW-05 để liên kết từ tổng quan sang chi tiết luôn trỏ tới lịch có thật trong dữ liệu mô phỏng.
// Thay toàn bộ bằng dữ liệu API khi nối backend; khi đó xóa tệp này.
export const MOCK_NOW = "2026-10-06T09:20:00+07:00";

// Booking.BufferMinutes từ GET /config (15 – 20 phút).
export const MOCK_BUFFER_MINUTES = 15;

const appointmentId = (n: number) => `5f1c${n.toString(16).padStart(4, "0")}-7e44-4c0a-9d21-0a1b2c3d4e00`;
const staffId = (n: number) => `6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f0${n}`;
const cageId = (n: number) => `c0000000-0000-4000-8000-0000000000${n.toString().padStart(2, "0")}`;
const CUSTOMER_ID = "8b1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f21";

export const MOCK_STAFF: Staff[] = [
  { staffId: staffId(1), userName: "0901000001", fullName: "Nguyễn Thị Hạnh", staffRole: "SpaStaff", isActive: true },
  { staffId: staffId(2), userName: "0901000002", fullName: "Trần Thị Quyên", staffRole: "SpaStaff", isActive: true },
  { staffId: staffId(3), userName: "0901000003", fullName: "Lê Minh Tâm", staffRole: "SpaStaff", isActive: true },
  { staffId: staffId(4), userName: "0901000004", fullName: "Đỗ Thu Hà", staffRole: "Receptionist", isActive: true },
  { staffId: staffId(5), userName: "0901000005", fullName: "Phạm Văn Phúc", staffRole: "SpaStaff", isActive: false },
];

const [HANH, QUYEN, TAM] = MOCK_STAFF;

export const MOCK_SHIFTS: WorkShift[] = [
  { shiftId: "d1000000-0000-4000-8000-000000000001", staffId: HANH.staffId, shiftStart: "2026-10-06T08:00:00+07:00", shiftEnd: "2026-10-06T17:00:00+07:00" },
  { shiftId: "d1000000-0000-4000-8000-000000000002", staffId: QUYEN.staffId, shiftStart: "2026-10-06T08:00:00+07:00", shiftEnd: "2026-10-06T17:00:00+07:00" },
  { shiftId: "d1000000-0000-4000-8000-000000000003", staffId: TAM.staffId, shiftStart: "2026-10-06T09:30:00+07:00", shiftEnd: "2026-10-06T18:30:00+07:00" },
];

const assigned = (staff: Staff, assignedAt: string) => ({ staffId: staff.staffId, fullName: staff.fullName, isHolding: true, assignedAt });

type SpaInput = Pick<AppointmentDetail, "petName" | "status" | "slotStart" | "slotEnd" | "staff"> &
  Partial<Pick<AppointmentDetail, "pendingCostConfirmation" | "services">> & { no: number; petNo: number; customerName: string };

function spa({ no, petNo, customerName, ...rest }: SpaInput): AppointmentDetail {
  return {
    appointmentId: appointmentId(no),
    type: "Spa",
    customerId: CUSTOMER_ID,
    petId: `7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f${petNo.toString().padStart(2, "0")}`,
    customerName,
    sizeGroup: "Medium",
    staffRequired: 1,
    createdAt: "2026-10-03T20:14:00+07:00",
    updatedAt: "2026-10-06T09:03:00+07:00",
    ...rest,
  };
}

// Lịch spa hôm nay: đủ trạng thái để thấy cả 4 màu trên biểu đồ; “Gạo” đã hoàn tất để kiểm tra việc bỏ lịch đã xong.
export const MOCK_SPA_TODAY: AppointmentDetail[] = [
  spa({
    no: 1029, petNo: 1, customerName: "Trần Minh Anh", petName: "Bông", status: "Received",
    slotStart: "2026-10-06T09:00:00+07:00", slotEnd: "2026-10-06T11:00:00+07:00",
    staff: [assigned(HANH, "2026-10-04T08:30:00+07:00")],
    pendingCostConfirmation: {
      actualWeightKg: 11.2, newSizeGroup: "Large", oldAmount: 270000, newAmount: 330000, status: "Pending",
      createdAt: "2026-10-06T09:03:00+07:00", expiresAt: "2026-10-06T09:33:00+07:00",
    },
  }),
  spa({
    no: 1030, petNo: 2, customerName: "Phan Mỹ Linh", petName: "Mít", status: "Confirmed",
    slotStart: "2026-10-06T12:00:00+07:00", slotEnd: "2026-10-06T13:00:00+07:00",
    staff: [assigned(HANH, "2026-10-05T10:00:00+07:00")],
  }),
  spa({
    no: 1031, petNo: 3, customerName: "Võ Thanh Tùng", petName: "Nâu", status: "InProgress",
    slotStart: "2026-10-06T09:00:00+07:00", slotEnd: "2026-10-06T10:45:00+07:00",
    staff: [assigned(QUYEN, "2026-10-05T10:05:00+07:00")],
  }),
  spa({
    no: 1032, petNo: 4, customerName: "Lý Ngọc Hân", petName: "Sushi", status: "Confirmed",
    slotStart: "2026-10-06T15:00:00+07:00", slotEnd: "2026-10-06T16:00:00+07:00",
    staff: [assigned(QUYEN, "2026-10-05T10:10:00+07:00")],
  }),
  spa({
    no: 1033, petNo: 5, customerName: "Hồ Thanh Tâm", petName: "Mước", status: "Received",
    slotStart: "2026-10-06T10:00:00+07:00", slotEnd: "2026-10-06T11:30:00+07:00",
    staff: [assigned(TAM, "2026-10-05T10:15:00+07:00")],
  }),
  spa({
    no: 1034, petNo: 6, customerName: "Châu Bảo Trân", petName: "Mochi", status: "Pending",
    slotStart: "2026-10-06T14:00:00+07:00", slotEnd: "2026-10-06T15:30:00+07:00",
    staff: [],
  }),
  spa({
    no: 1020, petNo: 7, customerName: "Đoàn Văn Khoa", petName: "Gạo", status: "Completed",
    slotStart: "2026-10-06T08:00:00+07:00", slotEnd: "2026-10-06T08:50:00+07:00",
    staff: [assigned(HANH, "2026-10-04T09:00:00+07:00")],
  }),
];

// Loài của từng thú cưng (GET /pets/{petId}); Appointment không có loài.
export const MOCK_PET_SPECIES: Record<string, Species> = {
  "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f01": "Dog",
  "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f02": "Cat",
  "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f03": "Dog",
  "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f04": "Rabbit",
  "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f05": "Cat",
  "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f06": "Cat",
  "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f07": "Dog",
};

const CAGE_CODES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2"];
const CAGE_SPECIES: Species[] = ["Dog", "Dog", "Dog", "Cat", "Cat", "Cat", "Cat", "Cat", "Cat", "GuineaPig", "GuineaPig"];

const occupant = (petName: string, customerName: string, plannedCheckOut: string, n: number) => ({
  petId: `7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f${(10 + n).toString()}`,
  petName,
  customerId: `8b1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f${(20 + n).toString()}`,
  customerName,
  plannedCheckOut,
});

// 11 chuồng đang hoạt động, 3 chuồng có thú cưng.
export const MOCK_CAGES: Cage[] = CAGE_CODES.map((code, index): Cage => {
  const base: Cage = { cageId: cageId(index + 1), code, species: CAGE_SPECIES[index], sizeGroup: "Medium", isActive: true, occupant: null };
  if (code === "B1") return { ...base, occupant: occupant("Tuyết", "Nguyễn Hải Yến", "2026-10-06T18:00:00+07:00", 1) };
  if (code === "A2") return { ...base, occupant: occupant("Bơ", "Trương Hoài Nam", "2026-10-07T17:00:00+07:00", 2) };
  if (code === "D2") return { ...base, occupant: occupant("Kem", "Lý Thảo", "2026-10-09T10:00:00+07:00", 3) };
  return base;
});

const CAGE_C1 = MOCK_CAGES.find((cage) => cage.code === "C1")!;
const CAGE_B1 = MOCK_CAGES.find((cage) => cage.code === "B1")!;

// Lịch lưu trú liên quan đến hôm nay: Cốm nhận lúc 10:00 (Đã xác nhận), Tuyết trả lúc 18:00 (Đang lưu trú).
export const MOCK_HOTEL_APPOINTMENTS: AppointmentDetail[] = [
  {
    appointmentId: appointmentId(1026), type: "Hotel", customerId: CUSTOMER_ID, petId: "7a1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f31",
    customerName: "Phạm Quốc Huy", petName: "Cốm", status: "Confirmed", sizeGroup: "Medium", cageId: CAGE_C1.cageId,
    plannedCheckIn: "2026-10-06T10:00:00+07:00", plannedCheckOut: "2026-10-08T17:00:00+07:00",
    createdAt: "2026-10-03T20:14:00+07:00", updatedAt: "2026-10-04T08:30:00+07:00",
  },
  {
    appointmentId: appointmentId(1003), type: "Hotel", customerId: CUSTOMER_ID, petId: CAGE_B1.occupant!.petId,
    customerName: "Nguyễn Hải Yến", petName: "Tuyết", status: "InStay", sizeGroup: "Medium", cageId: CAGE_B1.cageId,
    plannedCheckIn: "2026-10-04T08:00:00+07:00", plannedCheckOut: "2026-10-06T18:00:00+07:00",
    createdAt: "2026-10-01T19:02:00+07:00", updatedAt: "2026-10-04T08:06:00+07:00",
  },
];

// Hai khoản tiền lưu trú chưa thanh toán (690.000đ), như UI demo.
export const MOCK_UNPAID_PAYMENTS: Payment[] = [
  { paymentId: "9e3b0001-2a6d-4b18-8c35-6d7e8f9a0b00", appointmentId: appointmentId(1026), kind: "Stay", amount: 250000, status: "Unpaid" },
  { paymentId: "9e3b0002-2a6d-4b18-8c35-6d7e8f9a0b00", appointmentId: appointmentId(1035), kind: "Stay", amount: 440000, status: "Unpaid" },
];

// Số lịch chờ xác nhận theo loại: GET /appointments?status=Pending&type=…&pageSize=1 → total (UI-Screens MW-02 vùng 2).
export const MOCK_PENDING_COUNTS = { spa: 3, hotel: 1 };

// Ảnh minh chứng theo lịch (GET /appointments/{id}/photos). URL ảnh mẫu mã hóa thẳng trong chuỗi để không cần tệp ảnh.
const PLACEHOLDER_PHOTO_URL = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6eae6"/><stop offset="1" stop-color="#d3dad5"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/></svg>',
)}`;

const photo = (photoId: string, kind: Photo["kind"], uploadedAt: string): Photo => ({ photoId, kind, url: PLACEHOLDER_PHOTO_URL, uploadedAt });

export const MOCK_PHOTOS: Record<string, Photo[]> = {
  // Đang thực hiện: có ảnh trước, chưa có ảnh sau.
  [appointmentId(1031)]: [photo("e1000000-0000-4000-8000-000000000001", "Before", "2026-10-06T09:10:00+07:00")],
  // Đã hoàn tất: đủ ảnh trước và sau.
  [appointmentId(1020)]: [
    photo("e1000000-0000-4000-8000-000000000002", "Before", "2026-10-06T08:02:00+07:00"),
    photo("e1000000-0000-4000-8000-000000000003", "After", "2026-10-06T08:48:00+07:00"),
  ],
  // Đã tiếp nhận, chưa có ảnh nào: các lịch còn lại không có khóa trong bảng này.
};
