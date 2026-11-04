import { Icon } from "@/components/icons";
import { getErrorMessage, isRateLimitedError } from "@/lib/api/errors";

export function ErrorAlert({ error, className = "" }: { error: unknown; className?: string }) {
  if (!error) return null;

  const rateLimited = isRateLimitedError(error);

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 leading-5 ${
        rateLimited ? "border-[#F1D9A2] bg-[#FFF6E3]" : "border-[#EFC3BE] bg-danger-50"
      } ${className}`}
    >
      <Icon
        name={rateLimited ? "timer" : "x-circle"}
        className={`mt-px size-[18px] ${rateLimited ? "text-[#B87400]" : "text-danger"}`}
      />
      <div className="min-w-0 break-words">{getErrorMessage(error)}</div>
    </div>
  );
}
