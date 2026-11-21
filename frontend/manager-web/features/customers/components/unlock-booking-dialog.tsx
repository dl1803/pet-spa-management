import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Customer } from "@/lib/api/types";
import { LOCKED_CUSTOMER_MESSAGES } from "../list";

type UnlockBookingDialogProps = {
  customer: Customer;
  onConfirm: () => void;
  onCancel: () => void;
};

// MW-09·D1 – xác nhận gỡ khóa tự đặt lịch.
export function UnlockBookingDialog({ customer, onConfirm, onCancel }: UnlockBookingDialogProps) {
  return (
    <ConfirmDialog
      icon="lock"
      tone="warn"
      title={LOCKED_CUSTOMER_MESSAGES.dialogTitle}
      description={LOCKED_CUSTOMER_MESSAGES.dialogDescription}
      confirmLabel={LOCKED_CUSTOMER_MESSAGES.confirm}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <ul className="list-disc space-y-1 pl-[18px]">
        <li>Khách hàng: {customer.fullName}.</li>
        <li>{LOCKED_CUSTOMER_MESSAGES.dialogEffect}</li>
      </ul>
    </ConfirmDialog>
  );
}
