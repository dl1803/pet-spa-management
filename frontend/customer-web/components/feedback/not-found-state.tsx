import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

type NotFoundStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

// Thay nội dung màn khi API trả 404.
export function NotFoundState({ title, description, action, className = "" }: NotFoundStateProps) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-line bg-mist px-4 py-3.5 leading-5 ${className}`}>
      <Icon name="info" className="mt-px size-[18px] text-muted" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted">{description}</div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

