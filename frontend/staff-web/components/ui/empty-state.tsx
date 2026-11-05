import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-5 py-10 text-center">
      <span className="mb-1.5 grid size-22 place-items-center rounded-[28px] bg-lagoon-50 text-lagoon">
        <Icon name={icon} className="size-9" />
      </span>
      <h2>{title}</h2>
      <p className="max-w-[340px] text-muted">{description}</p>
      {action}
    </div>
  );
}

