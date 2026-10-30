import type { ReactNode } from "react";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

type SummaryCardProps = {
  title: string;
  footer: ReactNode;
  children: ReactNode;
};

export function SummaryCard({ title, footer, children }: SummaryCardProps) {
  return (
    <aside className="sticky top-[92px] max-[1180px]:static">
      <Card>
        <CardHeader title={title} />
        <CardBody>{children}</CardBody>
        <CardFooter className="flex-col items-stretch">{footer}</CardFooter>
      </Card>
    </aside>
  );
}

type SumLineProps = { title: string; meta: string; amount: number };

export function SumLine({ title, meta, amount }: SumLineProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="min-w-0 grow">
        {title}
        <div className="text-xs text-muted">{meta}</div>
      </div>
      <span className="whitespace-nowrap font-semibold tabular-nums">{formatMoney(amount)}</span>
    </div>
  );
}

type SumTotalProps = { label: string; amount: number; note: string };

export function SumTotal({ label, amount, note }: SumTotalProps) {
  return (
    <div className="mt-1.5 grid grid-cols-[1fr_auto] items-baseline gap-x-3 border-t border-dashed border-line pt-3.5">
      <div className="font-semibold">{label}</div>
      <span className="whitespace-nowrap text-right text-[22px] font-bold leading-7 tabular-nums">{formatMoney(amount)}</span>
      <div className="col-span-full mt-0.5 text-xs text-muted">{note}</div>
    </div>
  );
}

