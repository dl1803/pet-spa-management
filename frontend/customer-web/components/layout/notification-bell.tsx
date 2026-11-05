"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { useUnreadNotificationCount } from "@/lib/queries/notifications";
import { ROUTES } from "@/lib/routes";

export function NotificationBell({ active }: { active: boolean }) {
  const { data: unread = 0 } = useUnreadNotificationCount();

  return (
    <Link
      href={ROUTES.notifications}
      aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
      title="Thông báo"
      aria-current={active ? "page" : undefined}
      className={`relative grid size-10 place-items-center rounded-xl text-ink hover:bg-mist ${
        active ? "bg-lagoon-50 text-lagoon-700 hover:bg-lagoon-50" : ""
      }`}
    >
      <Icon name="bell" className="size-[22px]" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-[3px] top-1 h-[18px] min-w-[18px] rounded-full border-2 border-white bg-danger px-[5px] text-center text-[11px] font-bold leading-[14px] text-white"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

