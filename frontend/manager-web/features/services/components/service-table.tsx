import { Icon } from "@/components/icons";
import { PetAvatar } from "@/components/domain/pet-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { formatMoney } from "@/lib/format";
import type { Service } from "@/lib/api/types";
import { SPECIES_LABELS } from "@/lib/labels";
import { getMinPrice, getPricingSpecies } from "../forms";

type ServiceTableProps = {
  services: Service[];
  onEdit: (service: Service) => void;
  onStop: (service: Service) => void;
  onReopen: (service: Service) => void;
};

const headerClass = "px-4 py-3 text-left text-xs font-semibold text-muted";

// MW-06 vùng 2 – Bảng dịch vụ (UI-Screens.md).
export function ServiceTable({ services, onEdit, onStop, onReopen }: ServiceTableProps) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead className="bg-mist">
            <tr>
              <th scope="col" className={headerClass}>Dịch vụ</th>
              <th scope="col" className={headerClass}>Loài áp dụng</th>
              <th scope="col" className={`${headerClass} text-right`}>Giá từ</th>
              <th scope="col" className={headerClass}>Bắt đầu muộn nhất</th>
              <th scope="col" className={headerClass}>Trạng thái</th>
              <th scope="col" className={`${headerClass} text-right`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const minPrice = getMinPrice(service.pricing);
              const speciesList = getPricingSpecies(service.pricing);
              return (
                <tr key={service.serviceId} className={`border-t border-line-soft align-middle ${service.isActive ? "" : "opacity-70"}`}>
                  <td className="px-4 py-3.5">
                    <div className="font-semibold">{service.name}</div>
                    {service.description && <div className="text-xs text-muted">{service.description}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div
                      role="img"
                      aria-label={speciesList.map((species) => SPECIES_LABELS[species]).join(", ")}
                      className="flex gap-1"
                    >
                      {speciesList.map((species) => (
                        <PetAvatar key={species} species={species} size="sm" />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{minPrice === null ? "–" : formatMoney(minPrice)}</td>
                  <td className="px-4 py-3.5 tabular-nums">{service.latestStartTime}</td>
                  <td className="px-4 py-3.5">
                    {service.isActive ? <Tag tone="ok">Đang cung cấp</Tag> : <Tag tone="default">Đã ngừng</Tag>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" aria-label={`Sửa dịch vụ ${service.name}`} onClick={() => onEdit(service)}>
                        <Icon name="edit" className="size-4" />
                        Sửa
                      </Button>
                      {service.isActive ? (
                        <Button variant="ghost" size="sm" aria-label={`Ngừng dịch vụ ${service.name}`} onClick={() => onStop(service)}>
                          Ngừng
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" aria-label={`Mở lại dịch vụ ${service.name}`} onClick={() => onReopen(service)}>
                          Mở lại
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
