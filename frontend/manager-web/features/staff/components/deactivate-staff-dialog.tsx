import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Staff } from "@/lib/api/types";
import { getGivenName } from "../list";

type DeactivateStaffDialogProps = {
  staff: Staff;
  onConfirm: () => void;
  onCancel: () => void;
};

// MW-08·D2 – xác nhận vô hiệu hóa tài khoản (hộp thoại nguy hiểm, SA 6.6).
// Hậu quả về lịch spa và đề xuất phân công chỉ áp dụng cho nhân viên spa (openapi deactivateStaff, BR-27);
// số lịch về Chờ xác nhận chỉ biết sau khi gọi API nên không nêu ở đây.
export function DeactivateStaffDialog({ staff, onConfirm, onCancel }: DeactivateStaffDialogProps) {
  const name = getGivenName(staff.fullName);

  return (
    <ConfirmDialog
      icon="ban"
      tone="danger"
      title={`Vô hiệu hóa tài khoản ${staff.fullName}?`}
      description="Dùng khi nhân viên nghỉ việc."
      confirmLabel="Vô hiệu hóa"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <ul className="list-disc space-y-1 pl-[18px]">
        <li>{name} mất quyền đăng nhập ngay lập tức.</li>
        {staff.staffRole === "SpaStaff" && (
          <>
            <li>
              Các lịch spa Đã xác nhận đang phân công cho {name} quay về Chờ xác nhận để bạn phân công lại. Khách hàng nhận thông báo.
            </li>
            <li>{name} không còn xuất hiện trong danh sách đề xuất và lịch làm việc.</li>
          </>
        )}
      </ul>
    </ConfirmDialog>
  );
}
