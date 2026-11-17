import { apiClient } from "@/lib/api/client";
import type { SpaBookingCreated, SpaBookingRequest, SpaSlots } from "@/lib/api/types";

export type GetSpaSlotsParams = {
  // Ngày YYYY-MM-DD theo múi giờ cửa hàng.
  date: string;
  petId: string;
  serviceIds: string[];
};

// GET /spa/slots: mốc giờ spa của một ngày cho thú cưng và các dịch vụ đã chọn.
export async function getSpaSlots({ date, petId, serviceIds }: GetSpaSlotsParams) {
  // openapi: serviceIds dạng form, explode: false, tức một chuỗi "a,b,c".
  const { data } = await apiClient.get<SpaSlots>("/spa/slots", {
    params: { date, petId, serviceIds: serviceIds.join(",") },
  });
  return data;
}

// POST /appointments/spa: tạo lịch hẹn spa ở trạng thái Chờ xác nhận (201).
export async function createSpaAppointment(request: SpaBookingRequest) {
  const { data } = await apiClient.post<SpaBookingCreated>("/appointments/spa", request);
  return data;
}
