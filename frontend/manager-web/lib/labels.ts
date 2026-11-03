import type { SizeGroup, Species, StaffRole } from "@/lib/api/types";

export const SPECIES_LABELS: Record<Species, string> = {
  Dog: "Chó",
  Cat: "Mèo",
  Rabbit: "Thỏ",
  GuineaPig: "Chuột lang",
};

export const SIZE_GROUP_LABELS: Record<SizeGroup, string> = {
  Small: "Nhỏ",
  Medium: "Vừa",
  Large: "Lớn",
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  Receptionist: "Lễ tân",
  SpaStaff: "Nhân viên spa",
};
