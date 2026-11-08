"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import type { StaffRole } from "@/lib/api/types";
import { STAFF_ROLE_LABELS } from "@/lib/labels";
import { ROUTES } from "@/lib/routes";
import { Dropdown, dropdownItemClass } from "./dropdown";
import { onDarkFocusClass, onDarkMutedTextClass } from "./header-styles";

type MenuItem = {
  href: string;
  label: string;
  icon: IconName;
  roles: readonly StaffRole[];
  available?: boolean;
};

const ALL_ROLES: readonly StaffRole[] = ["Receptionist", "SpaStaff"];
const RECEPTIONIST_ONLY: readonly StaffRole[] = ["Receptionist"];
const SPA_STAFF_ONLY: readonly StaffRole[] = ["SpaStaff"];

// Thứ tự menu theo UI-Screens mục 2.1 (Lễ tân và Nhân viên spa dùng chung một khung).
const NAV_ITEMS: MenuItem[] = [
  { href: ROUTES.appointments, label: "Lịch hẹn", icon: "calendar", roles: ALL_ROLES },
  { href: ROUTES.checkIn, label: "Tiếp nhận", icon: "clipboard", roles: RECEPTIONIST_ONLY, available: true },
  { href: ROUTES.checkOut, label: "Trả thú cưng", icon: "handover", roles: RECEPTIONIST_ONLY },
  { href: ROUTES.customers, label: "Khách hàng", icon: "users", roles: RECEPTIONIST_ONLY },
  { href: ROUTES.booking, label: "Đặt lịch thay", icon: "calendar-plus", roles: RECEPTIONIST_ONLY, available: true },
  { href: ROUTES.cages, label: "Chuồng", icon: "grid", roles: RECEPTIONIST_ONLY },
  { href: ROUTES.payments, label: "Thanh toán", icon: "wallet", roles: RECEPTIONIST_ONLY },
  { href: ROUTES.workHistory, label: "Lịch sử công việc", icon: "history", roles: SPA_STAFF_ONLY, available: true },
  { href: ROUTES.services, label: "Dịch vụ", icon: "list", roles: SPA_STAFF_ONLY },
];

const NOTIFICATION_ITEM: MenuItem = {
  href: ROUTES.notifications,
  label: "Thông báo",
  icon: "bell",
  roles: SPA_STAFF_ONLY,
  available: true,
};

const ACCOUNT_ITEMS: MenuItem[] = [
  { href: ROUTES.profile, label: "Hồ sơ cá nhân", icon: "user", roles: ALL_ROLES },
  { href: ROUTES.services, label: "Danh mục dịch vụ", icon: "list", roles: RECEPTIONIST_ONLY },
];

const UNAVAILABLE_HINT_ID = "staff-navigation-unavailable";

function canSee(item: MenuItem, role: StaffRole | null) {
  return role !== null && item.roles.includes(role);
}

function isUnder(pathname: string | null, base: string) {
  if (!pathname) return false;
  return pathname === base || pathname.startsWith(`${base}/`);
}

const navItemClass = `inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-[13px] max-[640px]:gap-0 max-[640px]:px-[11px] ${onDarkFocusClass}`;
const navItemIdleClass = "font-medium text-[#CFE7E9] hover:bg-white/[.08] hover:text-white";
const navItemActiveClass = "bg-white font-semibold text-lagoon-700 hover:bg-white hover:text-lagoon-700";
const navItemDisabledClass = `cursor-not-allowed font-medium ${onDarkMutedTextClass}`;

const iconButtonClass = `relative grid size-11 place-items-center rounded-xl ${onDarkFocusClass}`;
const chipClass = "flex h-11 items-center gap-2.5 whitespace-nowrap rounded-full border border-white/25 pl-1 pr-2.5 text-sm font-medium text-white max-[860px]:gap-1 max-[860px]:pr-1.5";
const disabledMenuItemClass = "flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-left text-sm text-muted";

function NavLabel({ children }: { children: string }) {
  return <span className="max-[640px]:sr-only">{children}</span>;
}

function AccountAvatar() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-apricot-100 text-apricot-700">
      <Icon name="user" />
    </span>
  );
}

type HeaderNavProps = {
  pathname: string | null;
  // null khi chưa có phiên đăng nhập: chỉ hiện logo, chưa hiện mục menu nào.
  role: StaffRole | null;
};

export function HeaderNav({ pathname, role }: HeaderNavProps) {
  const navItems = NAV_ITEMS.filter((item) => canSee(item, role));
  const accountItems = ACCOUNT_ITEMS.filter((item) => canSee(item, role));
  const showNotifications = canSee(NOTIFICATION_ITEM, role);
  const notificationsActive = isUnder(pathname, NOTIFICATION_ITEM.href);

  return (
    <>
      <p id={UNAVAILABLE_HINT_ID} className="sr-only">Chức năng chưa khả dụng.</p>
      {navItems.length > 0 && (
        <nav
          aria-label="Menu nhân viên"
          className="flex min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] max-[980px]:flex-1 [&::-webkit-scrollbar]:hidden"
        >
          {navItems.map((item) => {
            const active = isUnder(pathname, item.href);
            const content = (
              <>
                <Icon name={item.icon} />
                <NavLabel>{item.label}</NavLabel>
              </>
            );

            // Chỉ bật liên kết khi trang đích tồn tại để menu không dẫn tới 404.
            if (!item.available) {
              return (
                <span
                  key={item.href}
                  role="link"
                  aria-disabled="true"
                  aria-describedby={UNAVAILABLE_HINT_ID}
                  title="Chức năng chưa khả dụng"
                  className={`${navItemClass} ${navItemDisabledClass}`}
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
                className={`${navItemClass} ${active ? navItemActiveClass : navItemIdleClass}`}
              >
                {content}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {showNotifications &&
          (NOTIFICATION_ITEM.available ? (
            <Link
              href={NOTIFICATION_ITEM.href}
              aria-label={NOTIFICATION_ITEM.label}
              title={NOTIFICATION_ITEM.label}
              aria-current={notificationsActive ? "page" : undefined}
              className={`${iconButtonClass} ${notificationsActive ? "bg-white text-lagoon-700" : "text-white hover:bg-white/10"}`}
            >
              <Icon name={NOTIFICATION_ITEM.icon} className="size-[22px]" />
            </Link>
          ) : (
            <span
              role="link"
              aria-disabled="true"
              aria-label={NOTIFICATION_ITEM.label}
              aria-describedby={UNAVAILABLE_HINT_ID}
              title="Chức năng chưa khả dụng"
              className={`${iconButtonClass} cursor-not-allowed ${onDarkMutedTextClass}`}
            >
              <Icon name={NOTIFICATION_ITEM.icon} className="size-[22px]" />
            </span>
          ))}

        {role === null ? (
          <div className={`${chipClass} opacity-70`}>
            <AccountAvatar />
            <span className="max-[860px]:sr-only">Chưa đăng nhập</span>
          </div>
        ) : (
          <Dropdown
            align="right"
            buttonClassName={`${chipClass} cursor-pointer hover:bg-white/10 ${onDarkFocusClass}`}
            label={
              <>
                <AccountAvatar />
                <span className="flex flex-col items-start text-left leading-[15px] max-[860px]:sr-only">
                  Tài khoản
                  <small className="text-[11px] font-medium opacity-80">{STAFF_ROLE_LABELS[role]}</small>
                </span>
                <Icon name="chev-d" className="size-4 opacity-80" />
              </>
            }
          >
            {accountItems.map((item) =>
              item.available ? (
                <Link key={item.href} href={item.href} className={dropdownItemClass}>
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.href}
                  role="link"
                  aria-disabled="true"
                  aria-describedby={UNAVAILABLE_HINT_ID}
                  className={disabledMenuItemClass}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </span>
              ),
            )}
            <div className="mx-1 my-1.5 h-px bg-line" />
            {/* Đăng xuất chỉ hoạt động khi có phiên đăng nhập. */}
            <button type="button" disabled className={disabledMenuItemClass}>
              <Icon name="logout" />
              Đăng xuất
            </button>
          </Dropdown>
        )}
      </div>
    </>
  );
}

export function ActiveHeaderNav({ role }: { role: StaffRole | null }) {
  return <HeaderNav pathname={usePathname()} role={role} />;
}
