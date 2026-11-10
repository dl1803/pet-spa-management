import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { getInitials } from "@/features/reception-customers/forms";
import type { Customer } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";
import { ROUTES, withQuery } from "@/lib/routes";

type CustomerCardProps = {
  customer: Customer;
  // Gọi khi lễ tân bấm một liên kết của thẻ: đặt khách này làm khách đang phục vụ rồi mới chuyển màn.
  onSelect: () => void;
  // Khối “Thú cưng” và “Lịch hẹn gần đây” của khách.
  children?: ReactNode;
};

// SW-04 vùng 2: thẻ khách tìm thấy. Chưa hiện thẻ “Có tài khoản”/“Khách vãng lai”: API Customer chưa có trường này (UI-Screens G-05).
export function CustomerCard({ customer, onSelect, children }: CustomerCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-start gap-4">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-apricot-100 text-lg font-bold text-apricot-700"
          >
            {getInitials(customer.fullName)}
          </span>
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2>{customer.fullName}</h2>
              {customer.isBookingLocked ? (
                <Tag tone="lock">Bị khóa tự đặt lịch</Tag>
              ) : (
                <Tag tone="ok">Đang được tự đặt lịch</Tag>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Icon name="phone" className="size-4" />
                {formatPhone(customer.phone)}
              </span>
              {customer.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="mail" className="size-4" />
                  {customer.email}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ButtonLink href={ROUTES.customerPetNew(customer.customerId)} variant="secondary" onClick={onSelect}>
              <Icon name="plus" />
              Thêm thú cưng
            </ButtonLink>
            <ButtonLink href={withQuery(ROUTES.booking, { customerId: customer.customerId })} onClick={onSelect}>
              <Icon name="calendar-plus" />
              Đặt lịch thay
            </ButtonLink>
          </div>
        </div>
        {children && <div className="mt-4 border-t border-line-soft pt-4">{children}</div>}
      </CardBody>
    </Card>
  );
}

