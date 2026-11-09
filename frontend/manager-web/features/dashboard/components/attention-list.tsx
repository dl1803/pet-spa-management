// features/dashboard/components/attention-list.tsx
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Card, CardHeader } from "@/components/ui/card";
import type { AttentionItem } from "@/features/dashboard/overview";

const ITEM_STYLE: Record<AttentionItem["kind"], { icon: IconName; box: string }> = {
  CostConfirmation: { icon: "scale", box: "bg-apricot-100 text-apricot-700" },
  CheckIn: { icon: "bed", box: "bg-info-50 text-info" },
  CheckOut: { icon: "handover", box: "bg-lagoon-50 text-lagoon-700" },
};

function ItemContent({ item }: { item: AttentionItem }) {
  const style = ITEM_STYLE[item.kind];
  return (
    <>
      <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full ${style.box}`}>
        <Icon name={style.icon} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{item.title}</span>
        <span className="block text-[13px] leading-[18px] text-muted">{item.detail}</span>
      </span>
    </>
  );
}

// MW-02 vùng 4 – Cần chú ý (UI-Screens.md). Mục có trang chi tiết thì bấm được; mục chưa có trang đích chỉ là chữ.
export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <Card>
      <CardHeader title="Cần chú ý" />
      {items.length === 0 ? (
        <p className="px-5 py-6 text-muted">Hiện không có việc cần chú ý.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {items.map((item) => (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} className="flex items-start gap-3 px-5 py-3.5 hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lagoon">
                  <ItemContent item={item} />
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-5 py-3.5">
                  <ItemContent item={item} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
