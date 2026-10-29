"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { ROUTES } from "@/lib/routes";
import { Dropdown, dropdownItemClass } from "./dropdown";

function isUnder(pathname: string | null, base: string) {
  if (!pathname) return false;
  return pathname === base || pathname.startsWith(`${base}/`);
}

const navItemClass =
  "inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-medium text-ink hover:bg-mist max-[860px]:gap-0 max-[860px]:px-[11px]";
const navItemActiveClass = "bg-lagoon-50 font-semibold text-lagoon-700 hover:bg-lagoon-50";

function NavLabel({ children }: { children: string }) {
  return <span className="max-[860px]:sr-only">{children}</span>;
}

export function HeaderNav({ pathname }: { pathname: string | null }) {
  const bookingActive = isUnder(pathname, "/dat-lich");
  const notificationsActive = isUnder(pathname, ROUTES.notifications);

  return (
    <>
      <nav aria-label="Menu chính" className="order-3 flex w-full items-center justify-around border-t border-line/60 pt-1.5 max-[860px]:gap-0 sm:order-2 sm:w-auto sm:justify-start sm:border-0 sm:pt-0 sm:gap-1">
        <Link
          href={ROUTES.home}
          aria-current={pathname === ROUTES.home ? "page" : undefined}
          className={`${navItemClass} ${pathname === ROUTES.home ? navItemActiveClass : ""}`}
        >
          <Icon name="home" />
          <NavLabel>Dịch vụ</NavLabel>
        </Link>
        <Link
          href={ROUTES.pets}
          aria-current={isUnder(pathname, ROUTES.pets) ? "page" : undefined}
          className={`${navItemClass} ${isUnder(pathname, ROUTES.pets) ? navItemActiveClass : ""}`}
        >
          <Icon name="paw" />
          <NavLabel>Thú cưng</NavLabel>
        </Link>
        <Dropdown
          buttonClassName={`${navItemClass} cursor-pointer ${bookingActive ? navItemActiveClass : ""}`}
          menuClassName="max-[640px]:left-1/2 max-[640px]:-translate-x-1/2 sm:left-0 sm:translate-x-0"
          label={
            <>
              <Icon name="calendar-plus" />
              <NavLabel>Đặt lịch</NavLabel>
              <Icon name="chev-d" className="size-4" />
            </>
          }
        >
          <Link href={ROUTES.spaBooking} className={dropdownItemClass}>
            <Icon name="droplet" className="size-[18px] text-lagoon" />
            <span>
              Lịch spa
              <span className="block text-xs text-muted">Tắm, cắt tỉa, vệ sinh, gói chăm sóc</span>
            </span>
          </Link>
          <Link href={ROUTES.hotelBooking} className={dropdownItemClass}>
            <Icon name="bed" className="size-[18px] text-[#6A5BC4]" />
            <span>
              Lưu trú
              <span className="block text-xs text-muted">Gửi bé ở lại theo đêm</span>
            </span>
          </Link>
        </Dropdown>
        <Link
          href={ROUTES.appointments}
          aria-current={isUnder(pathname, ROUTES.appointments) ? "page" : undefined}
          className={`${navItemClass} ${isUnder(pathname, ROUTES.appointments) ? navItemActiveClass : ""}`}
        >
          <Icon name="calendar" />
          <NavLabel>Lịch hẹn</NavLabel>
        </Link>
      </nav>

      <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
        <Link
          href={ROUTES.notifications}
          aria-label="Thông báo"
          title="Thông báo"
          aria-current={notificationsActive ? "page" : undefined}
          className={`relative grid size-10 place-items-center rounded-xl text-ink hover:bg-mist ${
            notificationsActive ? "bg-lagoon-50 text-lagoon-700 hover:bg-lagoon-50" : ""
          }`}
        >
          <Icon name="bell" className="size-[22px]" />
        </Link>
        <Dropdown
          align="right"
          buttonClassName="flex h-[42px] cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border border-line bg-white pl-1 pr-2.5 text-sm font-medium text-ink hover:border-[#B9CED2] max-[860px]:gap-1 max-[860px]:pr-1.5"
          label={
            <>
              <span className="grid size-8 place-items-center rounded-full bg-apricot-100 text-apricot-700">
                <Icon name="user" />
              </span>
              <span className="max-[860px]:sr-only">Tài khoản</span>
              <Icon name="chev-d" className="size-4 text-muted" />
            </>
          }
        >
          <Link href={ROUTES.profile} className={dropdownItemClass}>
            <Icon name="user" />
            Hồ sơ cá nhân
          </Link>
          <Link href={ROUTES.history} className={dropdownItemClass}>
            <Icon name="history" />
            Lịch sử dịch vụ
          </Link>
          <div className="mx-1 my-1.5 h-px bg-line" />
          <Link href={ROUTES.login} className={dropdownItemClass}>
            <Icon name="logout" />
            Đăng xuất
          </Link>
        </Dropdown>
      </div>
    </>
  );
}

export function ActiveHeaderNav() {
  return <HeaderNav pathname={usePathname()} />;
}

