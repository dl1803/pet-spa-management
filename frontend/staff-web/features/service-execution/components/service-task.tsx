"use client";

import { useForm } from "react-hook-form";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { AppointmentServiceItem } from "@/lib/api/types";
import { formatTime } from "@/lib/format";

type ServiceTaskProps = {
  service: AppointmentServiceItem;
  // Đánh dấu xong chỉ dùng được khi lịch đang thực hiện.
  canMarkDone: boolean;
  onMarkDone: (service: AppointmentServiceItem, note: string) => void;
};

const tickBaseClass = "grid size-7 shrink-0 place-items-center rounded-full border-[1.5px]";

type NoteForm = { note: string };

// SW-11 vùng 8 – Một dịch vụ (UI-Screens.md; Design-System 4.3 ServiceTask).
export function ServiceTask({ service, canMarkDone, onMarkDone }: ServiceTaskProps) {
  const { register, handleSubmit } = useForm<NoteForm>({ defaultValues: { note: "" } });
  const name = service.name ?? "Dịch vụ";

  // Màu nền, viền khi xong theo `.svc-task.done` của UI demo, chưa có token (Conventions mục 9).
  if (service.isDone) {
    return (
      <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3.5 rounded-xl border border-[#C9E5D3] bg-[#F6FBF8] p-4">
        <span className={`${tickBaseClass} border-success bg-success text-white`}>
          <Icon name="check" className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-muted">{service.doneAt ? `Xong lúc ${formatTime(service.doneAt)}` : "Đã xong"}</div>
          {service.note && <div className="mt-2 break-words rounded-xl bg-mist px-2.5 py-2 text-[13px]">{service.note}</div>}
        </div>
      </li>
    );
  }

  const noteId = `service-note-${service.serviceId}`;

  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <form
        onSubmit={handleSubmit(({ note }) => onMarkDone(service, note))}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 max-[640px]:grid-cols-[auto_minmax(0,1fr)]"
      >
        <span aria-hidden="true" className={`${tickBaseClass} border-control bg-white`} />
        <div className="min-w-0">
          <div className="font-semibold">{name}</div>
          {canMarkDone && (
            <>
              <div className="text-xs text-muted">Đang làm</div>
              <label htmlFor={noteId} className="mt-2 block text-[13px] font-semibold leading-[18px]">
                Ghi chú <span className="font-normal text-muted">(không bắt buộc)</span>
              </label>
              <textarea
                id={noteId}
                {...register("note")}
                className="mt-1.5 block min-h-16 w-full resize-y rounded-[10px] border border-line bg-white px-3 py-2.5 text-ink focus:border-lagoon focus:outline-none focus:ring-3 focus:ring-lagoon/20"
              />
            </>
          )}
        </div>
        <div className="max-[640px]:col-start-2">
          <Button type="submit" variant="secondary" size="sm" disabled={!canMarkDone}>
            Đánh dấu xong
          </Button>
        </div>
      </form>
    </li>
  );
}
