import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import type { Pet } from "@/lib/api/types";
import { buildProfileRows } from "@/features/spa-appointments/detail";

export function PetProfileCard({
  pet,
  isPending,
  error,
}: {
  pet: Pet | undefined;
  isPending: boolean;
  error: unknown;
}) {
  return (
    <Card>
      <CardHeader title="Hồ sơ thú cưng">
        <span className="inline-flex h-6 items-center rounded-[7px] bg-line-soft px-[9px] text-xs font-medium">
          Chỉ xem
        </span>
      </CardHeader>
      <CardBody>
        {isPending ? (
          <div>
            <Skeleton className="mb-3 h-5 w-full rounded" />
            <Skeleton className="mb-3 h-5 w-full rounded" />
            <Skeleton className="h-5 w-full rounded" />
          </div>
        ) : error ? (
          <ErrorAlert error={error} />
        ) : pet ? (
          <dl className="grid grid-cols-[180px_1fr] gap-x-6 gap-y-3.5 max-[640px]:grid-cols-1 max-[640px]:gap-y-1">
            {buildProfileRows(pet).map((row) => (
              <div key={row.label} className="contents max-[640px]:block max-[640px]:mb-2">
                <dt className="text-muted">{row.label}</dt>
                <dd className="font-semibold">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </CardBody>
    </Card>
  );
}
