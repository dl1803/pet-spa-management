import type { ReactNode } from "react";

const toneClass = {
  "st-1": "bg-st-pending-bg text-st-pending",
  "st-2": "bg-st-confirmed-bg text-st-confirmed",
  "st-3": "bg-st-received-bg text-st-received",
  "st-4": "bg-st-active-bg text-st-active",
  "st-5": "bg-st-completed-bg text-st-completed",
  "st-6": "bg-st-cancelled-bg text-st-cancelled",
};

export type BadgeTone = keyof typeof toneClass;

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold leading-none ${toneClass[tone]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-75" />
      {children}
    </span>
  );
}

