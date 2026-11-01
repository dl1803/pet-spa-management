import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-line bg-white">{children}</div>;
}

export function CardHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4 max-[640px]:flex-wrap">
      <h2 className="grow">{title}</h2>
      {children}
    </div>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="p-5">{children}</div>;
}

export function CardFooter({ children, className = "items-center" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-2.5 border-t border-line-soft px-5 py-3.5 max-[640px]:flex-wrap ${className}`}>
      {children}
    </div>
  );
}

