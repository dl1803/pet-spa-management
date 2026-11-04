import { PetAvatar } from "@/components/domain/pet-avatar";
import { Alert } from "@/components/feedback/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { ApplicableService } from "@/features/booking/forms";
import type { Pet } from "@/lib/api/types";
import { formatMoney, formatWeight, lowerFirst } from "@/lib/format";
import { SIZE_GROUP_LABELS, SPECIES_LABELS, TEMPERAMENT_LABELS } from "@/lib/labels";
import { STORE_HOTLINE } from "@/lib/store-info";

// Giờ cụ thể phụ thuộc cấu hình của quản lý nên dùng câu chung.
const BOOKING_NOTES = [
  "Bạn có thể tự đổi hoặc hủy miễn phí trước giờ hẹn một khoảng thời gian do cửa hàng quy định.",
  "Cửa hàng giữ chỗ trong một khoảng ngắn sau giờ hẹn. Quá thời gian này mà bé chưa được tiếp nhận, lịch tự động hủy do vắng mặt.",
  "Bé được cân lại khi tiếp nhận. Nếu lên nhóm lớn hơn, bạn cần xác nhận chi phí mới trong thời hạn quy định.",
  "Thanh toán sau khi hoàn tất, tại quầy hoặc trực tuyến.",
] as const;

type SpaBookingReviewStepProps = {
  pet: Pet;
  selected: ApplicableService[];
  /** "Thứ ba 06/10/2026, 14:00 – 16:00" */
  timeText: string;
  staffRequired: number;
  totalPrice: number;
  isLocked: boolean;
};

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-4 max-[640px]:grid-cols-1">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

export function SpaBookingReviewStep({
  pet,
  selected,
  timeText,
  staffRequired,
  totalPrice,
  isLocked,
}: SpaBookingReviewStepProps) {
  return (
    <>
      {isLocked && (
        <Alert tone="danger" icon="lock" title="Tài khoản tạm thời không thể tự đặt lịch">
          Bạn đã vắng mặt quá 3 lần trong 30 ngày gần đây. Vui lòng liên hệ cửa hàng qua hotline{" "}
          <strong>{STORE_HOTLINE}</strong> để được hỗ trợ đặt lịch.
        </Alert>
      )}
      <Card>
        <CardHeader title="Kiểm tra lại lịch hẹn" />
        <CardBody>
          <dl className="flex flex-col gap-2.5">
            <ReviewRow label="Thú cưng">
              <div className="flex items-center gap-3">
                <PetAvatar species={pet.species} />
                <div>
                  <div className="font-semibold">{pet.name}</div>
                  <div className="text-xs font-normal text-muted">
                    {`${SPECIES_LABELS[pet.species]} ${pet.breed}, ${formatWeight(pet.weightKg)}, nhóm ${SIZE_GROUP_LABELS[pet.sizeGroup]}, ${lowerFirst(TEMPERAMENT_LABELS[pet.temperament])}`}
                  </div>
                </div>
              </div>
            </ReviewRow>
            <ReviewRow label="Dịch vụ">{selected.map(({ service }) => service.name).join(", ")}</ReviewRow>
            <ReviewRow label="Thời gian">{timeText}</ReviewRow>
            <ReviewRow label="Nhân viên">{`Cần ${staffRequired} nhân viên, cửa hàng xếp khi xác nhận`}</ReviewRow>
            <ReviewRow label="Tạm tính">{formatMoney(totalPrice)}</ReviewRow>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Lưu ý cho lịch này" />
        <CardBody>
          <ul className="list-disc space-y-2 pl-5">
            {BOOKING_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
