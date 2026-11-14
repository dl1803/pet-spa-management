import { ServiceCatalogSection } from "@/features/home/components/service-catalog-section";

export function HomeScreen() {
  return (
    <>
      <div className="mb-6">
        <h1>Trang chủ</h1>
        <p className="mt-1 text-muted">Dịch vụ spa, giá và thời lượng theo loài và nhóm kích cỡ.</p>
      </div>
      <ServiceCatalogSection />
    </>
  );
}
