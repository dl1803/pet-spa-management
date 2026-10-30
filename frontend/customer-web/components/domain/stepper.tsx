type StepperProps = {
  steps: readonly string[];
  /** Số thứ tự bước hiện tại, bắt đầu từ 1. */
  current: number;
};

export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol aria-label="Các bước đặt lịch" className="mb-6 flex flex-wrap items-center gap-y-2">
      {steps.map((label, index) => {
        const number = index + 1;
        const isCurrent = number === current;
        const isLast = number === steps.length;

        return (
          <li key={label} aria-current={isCurrent ? "step" : undefined} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <span className={`flex items-center gap-2.5 whitespace-nowrap ${isCurrent ? "font-semibold text-ink" : "font-medium text-muted"}`}>
              <span
                className={`grid size-[30px] place-items-center rounded-full border-[1.5px] text-[13px] font-bold ${
                  isCurrent
                    ? "border-lagoon bg-lagoon text-white shadow-[0_0_0_4px_var(--color-lagoon-50)]"
                    : "border-line bg-white text-muted"
                }`}
              >
                {number}
              </span>
              <span className={isCurrent ? "" : "max-[640px]:sr-only"}>{label}</span>
            </span>
            {!isLast && <span aria-hidden="true" className="mx-3.5 h-0.5 min-w-7 flex-1 bg-line max-[640px]:mx-1.5 max-[640px]:min-w-3" />}
          </li>
        );
      })}
    </ol>
  );
}

