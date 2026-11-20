import { apiClient } from "@/lib/api/client";
import type {
  HotelBookingCreated,
  HotelBookingRequest,
  SpaBookingCreated,
  SpaBookingRequest,
  SpaSlots,
} from "@/lib/api/types";

export type GetSpaSlotsParams = {
  date: string;
  petId: string;
  serviceIds: string[];
};

export async function getSpaSlots({ date, petId, serviceIds }: GetSpaSlotsParams) {
  const { data } = await apiClient.get<SpaSlots>("/spa/slots", {
    params: { date, petId, serviceIds: serviceIds.join(",") },
  });
  return data;
}

export async function createSpaAppointment(request: SpaBookingRequest) {
  const { data } = await apiClient.post<SpaBookingCreated>("/appointments/spa", request);
  return data;
}

export async function createHotelAppointment(request: HotelBookingRequest) {
  const { data } = await apiClient.post<HotelBookingCreated>("/appointments/hotel", request);
  return data;
}
