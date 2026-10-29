"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { ROUTES } from "@/lib/routes";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  available?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.dashboard, label: "Tổng quan", icon: "dashboard", available: true },
  { href: ROUTES.appointments, label: "Lịch hẹn", icon: "list" },
  { href: ROUTES.pending, label: "Chờ xác nhận", icon: "clipboard" },
  { href: ROUTES.services, label: "Dịch vụ", icon: "scissors" },
  { href: ROUTES.cages, label: "Chuồng & giá", icon: "grid" },
  { href: ROUTES.staff, label: "Nhân viên", icon: "users" },
  { href: ROUTES.workShifts, label: "Lịch làm việc", icon: "calendar" },
  { href: ROUTES.lockedCustomers, label: "Khách bị khóa", icon: "lock" },
  { href: ROUTES.payments, label: "Thanh toán", icon: "wallet" },
  { href: ROUTES.config, label: "Cấu hình", icon: "sliders" },
];

const itemClass = "flex h-10 shrink-0 items-center gap-3 whitespace-nowrap rounded-[10px] px-3";

type SidebarNavProps = {
  pathname: string | null;
  pendingCount: number | null;
};

export function SidebarNav({ pathname, pendingCount }: SidebarNavProps) {
  return (
    <nav
      aria-label="Menu quản lý"
      className="relative flex min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3 pt-1 max-[980px]:flex-row max-[980px]:overflow-x-auto max-[980px]:p-2"
    >
      <p id="navigation-unavailable" className="sr-only">Chức năng chưa khả dụng.</p>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || (
          item.href !== ROUTES.dashboard && pathname?.startsWith(`${item.href}/`)
        );
        const count = item.href === ROUTES.pending ? (pendingCount ?? 0) : 0;
        const content = (
          <>
            <Icon name={item.icon} />
            {item.label}
            {count > 0 && (
              <>
                <span aria-hidden="true" className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-full bg-apricot px-1.5 text-xs font-bold text-ink">
                  {count}
                </span>
                <span className="sr-only">, {count} lịch đang chờ</span>
              </>
            )}
          </>
        );

        // Chỉ bật liên kết khi trang đích tồn tại để menu không dẫn tới 404.
        if (!item.available) {
          return (
            <span
              key={item.href}
              role="link"
              aria-disabled="true"
              aria-describedby="navigation-unavailable"
              title="Chức năng chưa khả dụng"
              className={`${itemClass} cursor-not-allowed font-medium text-[#89BDC2]`}
            >
              {content}
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${itemClass} focus-visible:outline-apricot focus-visible:outline-offset-0 ${active ? "bg-white font-semibold text-lagoon-800" : "font-medium text-[#D3E7E9] hover:bg-white/[.07] hover:text-white"}`}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export function ActiveSidebarNav({ pendingCount }: { pendingCount: number | null }) {
  return <SidebarNav pathname={usePathname()} pendingCount={pendingCount} />;
}
