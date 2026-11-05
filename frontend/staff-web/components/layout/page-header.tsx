import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-4">
      <div className="min-w-[260px] flex-1">
        <h1>{title}</h1>
        <p className="mt-1 text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}

