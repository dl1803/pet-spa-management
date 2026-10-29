import { Icon } from "@/components/icons";
import { ERROR_MESSAGES } from "@/lib/api/errors";

export function ForbiddenState({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-line bg-mist px-4 py-3.5 leading-5 ${className}`}>
      <Icon name="shield" className="mt-px size-[18px] text-muted" />
      <div>
        <div className="font-semibold">{ERROR_MESSAGES.forbiddenTitle}</div>
        <div className="text-xs text-muted">{ERROR_MESSAGES.forbiddenDetail}</div>
      </div>
    </div>
  );
}
