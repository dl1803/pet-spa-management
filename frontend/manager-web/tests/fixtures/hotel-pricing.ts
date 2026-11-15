import type { HotelPricing } from "@/lib/api/types";

// Dữ liệu mẫu đúng hình dạng HotelPricing của GET /hotel/pricing, theo UI demo (MW-07 tab Giá); chỉ dùng cho kiểm thử.
export const MOCK_HOTEL_PRICING: HotelPricing = {
  pricing: [
    { species: "Dog", sizeGroup: "Small", pricePerNight: 180000, foodPerNight: 40000 },
    { species: "Dog", sizeGroup: "Medium", pricePerNight: 220000, foodPerNight: 50000 },
    { species: "Dog", sizeGroup: "Large", pricePerNight: 280000, foodPerNight: 70000 },
    { species: "Cat", sizeGroup: "Small", pricePerNight: 150000, foodPerNight: 35000 },
    { species: "Cat", sizeGroup: "Medium", pricePerNight: 170000, foodPerNight: 40000 },
    { species: "Cat", sizeGroup: "Large", pricePerNight: 200000, foodPerNight: 45000 },
    { species: "Rabbit", sizeGroup: "Small", pricePerNight: 100000, foodPerNight: 25000 },
    { species: "Rabbit", sizeGroup: "Medium", pricePerNight: 120000, foodPerNight: 30000 },
    { species: "Rabbit", sizeGroup: "Large", pricePerNight: 140000, foodPerNight: 35000 },
    { species: "GuineaPig", sizeGroup: "Small", pricePerNight: 80000, foodPerNight: 20000 },
    { species: "GuineaPig", sizeGroup: "Large", pricePerNight: 100000, foodPerNight: 25000 },
  ],
  lateFeePerBlock: 50000,
};
