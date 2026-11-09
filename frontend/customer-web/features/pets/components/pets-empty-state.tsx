import { PetAvatar } from "@/components/domain/pet-avatar";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";

export function PetsEmptyState() {
  return (
    <Card>
      <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
        <div className="mb-2 flex gap-2">
          <PetAvatar species="Dog" size="lg" />
          <PetAvatar species="Cat" size="lg" />
          <PetAvatar species="Rabbit" size="lg" />
        </div>
        <h2>Chưa có thú cưng</h2>
        <p className="max-w-[340px] text-muted">
          Thêm hồ sơ cho bé để xem giá đúng nhóm kích cỡ và bắt đầu đặt lịch.
        </p>
        <ButtonLink href={ROUTES.petCreate} variant="secondary">
          <Icon name="plus" />
          Thêm thú cưng
        </ButtonLink>
      </div>
    </Card>
  );
}

