import Link from "next/link";
import { Icon } from "@/components/icons";
import { ROUTES } from "@/lib/routes";

type CustomerBreadcrumbProps = {
  customerName: string;
  current: string;
};

// SW-05 đường dẫn: Khách hàng › <tên khách> › Thêm thú cưng / <tên thú cưng>.
export function CustomerBreadcrumb({ customerName, current }: CustomerBreadcrumbProps) {
  return (
    <nav aria-label="Đường dẫn" className="mb-2 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
      <Link href={ROUTES.customers} className="hover:text-lagoon">
        Khách hàng
      </Link>
      <Icon name="chev-r" className="size-3.5" />
      <span>{customerName}</span>
      <Icon name="chev-r" className="size-3.5" />
      <span aria-current="page">{current}</span>
    </nav>
  );
}

