import { Icon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tag } from "@/components/ui/tag";
import type { Staff } from "@/lib/api/types";
import { formatPhone } from "@/lib/format";
import { STAFF_ROLE_LABELS } from "@/lib/labels";

type StaffTableProps = {
  staff: Staff[];
  onEdit: (staff: Staff) => void;
  onDeactivate: (staff: Staff) => void;
};

const headerClass = "px-4 py-3 text-left text-xs font-semibold text-muted";

// MW-08 vùng 3 – Bảng nhân viên (UI-Screens.md). Không có cột Ngày tạo vì GET /staff chưa trả ngày tạo.
export function StaffTable({ staff, onEdit, onDeactivate }: StaffTableProps) {
  if (staff.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="users"
          title="Chưa có nhân viên nào"
          description="Nhóm này chưa có tài khoản nào. Chọn nhóm khác hoặc thêm nhân viên mới."
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="bg-mist">
            <tr>
              <th scope="col" className={headerClass}>Nhân viên</th>
              <th scope="col" className={headerClass}>Số điện thoại (đăng nhập)</th>
              <th scope="col" className={headerClass}>Vai trò</th>
              <th scope="col" className={headerClass}>Trạng thái</th>
              <th scope="col" className={`${headerClass} text-right`}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.staffId} className={`border-t border-line-soft align-middle ${member.isActive ? "" : "opacity-70"}`}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={member.fullName} tone={member.staffRole === "SpaStaff" ? "teal" : "apricot"} />
                    <span className="font-semibold">{member.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 tabular-nums">{formatPhone(member.userName)}</td>
                <td className="px-4 py-3.5">{STAFF_ROLE_LABELS[member.staffRole]}</td>
                <td className="px-4 py-3.5">
                  {member.isActive ? <Tag tone="ok">Đang hoạt động</Tag> : <Tag tone="default">Đã vô hiệu hóa</Tag>}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Sửa nhân viên ${member.fullName}`} onClick={() => onEdit(member)}>
                      <Icon name="edit" className="size-4" />
                      Sửa
                    </Button>
                    {member.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Vô hiệu hóa tài khoản ${member.fullName}`}
                        onClick={() => onDeactivate(member)}
                      >
                        Vô hiệu hóa
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
