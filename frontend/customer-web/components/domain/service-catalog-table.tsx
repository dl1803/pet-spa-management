import type { Service, SizeGroup, Species } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

const SIZE_GROUP_ORDER = ["Small", "Medium", "Large"] as const satisfies readonly SizeGroup[];

const ROW_CLASS =
  "grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] border-b border-line-soft last:border-b-0 max-[640px]:grid-cols-[repeat(2,minmax(0,1fr))]";
const META_CLASS = "text-xs leading-4 text-muted";

type ServiceCatalogTableProps = {
  /** Dịch vụ đã lọc theo `species`: mỗi dịch vụ có ít nhất một dòng giá của loài này. */
  services: Service[];
  species: Species;
};

export function ServiceCatalogTable({ services, species }: ServiceCatalogTableProps) {
  return (
    <div role="table" className="overflow-hidden rounded-2xl border border-line bg-white">
      {/* Dưới 640px ẩn hàng tiêu đề, thay bằng nhãn nhóm trong từng ô giá. */}
      <div role="row" className={`${ROW_CLASS} bg-mist max-[640px]:hidden`}>
        <div role="columnheader" className="px-4 py-2.5 text-xs font-semibold text-muted">
          Dịch vụ
        </div>
        {SIZE_GROUP_ORDER.map((group) => (
          <div key={group} role="columnheader" className="px-4 py-2.5 text-xs font-semibold text-muted">
            Nhóm {SIZE_GROUP_LABELS[group]}
          </div>
        ))}
      </div>
      {services.map((service) => (
        <div key={service.serviceId} role="row" className={ROW_CLASS}>
          <div role="rowheader" className="px-4 py-3.5 max-[640px]:col-span-2">
            <div className="font-semibold">{service.name}</div>
            {service.description ? <div className={`mt-0.5 ${META_CLASS}`}>{service.description}</div> : null}
            <div className={`mt-0.5 ${META_CLASS}`}>Nhận đến {service.latestStartTime}</div>
          </div>
          {SIZE_GROUP_ORDER.map((group) => {
            const row = service.pricing.find((item) => item.species === species && item.sizeGroup === group);
            return (
              <div key={group} role="cell" className="px-4 py-3.5">
                <div className={`mb-0.5 hidden font-semibold max-[640px]:block ${META_CLASS}`}>
                  Nhóm {SIZE_GROUP_LABELS[group]}
                </div>
                {row === undefined ? (
                  <div className="text-muted">Không áp dụng</div>
                ) : (
                  <>
                    <div className="font-bold tabular-nums">{formatMoney(row.price)}</div>
                    <div className={META_CLASS}>{row.durationMinutes} phút</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
