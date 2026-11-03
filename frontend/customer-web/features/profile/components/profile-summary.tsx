import { Icon } from "@/components/icons";
import { Card, CardBody } from "@/components/ui/card";

type ProfileSummaryProps = {
  fullName: string;
  petCount: number;
};

// Chữ cái đầu của hai từ cuối trong họ tên, ví dụ "Trần Minh Anh" → "MA".
function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

export function ProfileSummary({ fullName, petCount }: ProfileSummaryProps) {
  const initials = getInitials(fullName);

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-apricot-100 text-lg font-bold text-apricot-700"
          >
            {initials || <Icon name="user" className="size-6" />}
          </span>
          <div className="min-w-0 break-words font-semibold">{fullName}</div>
        </div>
        <div className="my-4 h-px bg-line" />
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted">Thú cưng</span>
          <span className="font-semibold tabular-nums">{petCount} hồ sơ</span>
        </div>
      </CardBody>
    </Card>
  );
}

