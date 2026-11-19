import type { Gateway } from "@/lib/api/types";
import { GATEWAY_LABELS } from "@/lib/labels";

// Logo chữ của cổng theo UI demo (Design-System 4.3), chưa có token màu.
const GATEWAY_LOGOS: Record<Gateway, { text: string; background: string }> = {
  VNPAY: { text: "VNPAY", background: "bg-[#005BAA]" },
  MoMo: { text: "MoMo", background: "bg-[#A50064]" },
};

type GatewayOptionProps = {
  gateway: Gateway;
  description: string;
};

// Chỉ hiển thị cổng đang được dùng, không phải ô chọn.
export function GatewayOption({ gateway, description }: GatewayOptionProps) {
  const logo = GATEWAY_LOGOS[gateway];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-lagoon bg-lagoon-25 px-3.5 py-3 shadow-[inset_0_0_0_1px_var(--color-lagoon)]">
      <span
        aria-hidden="true"
        className={`grid h-9 w-[52px] shrink-0 place-items-center rounded-lg text-[11px] font-extrabold text-white ${logo.background}`}
      >
        {logo.text}
      </span>
      <div className="min-w-0">
        <div className="font-semibold">{GATEWAY_LABELS[gateway]}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
    </div>
  );
}
