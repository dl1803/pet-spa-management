"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { FilterChip } from "@/components/ui/filter-chip";
import type { Staff, StaffCreateRequest, StaffUpdateRequest } from "@/lib/api/types";
import { ROUTES, withQuery } from "@/lib/routes";
import { DeactivateStaffDialog } from "../components/deactivate-staff-dialog";
import { StaffForm } from "../components/staff-form";
import { StaffTable } from "../components/staff-table";
import { countStaff, filterStaff, parseStaffFilter, STAFF_FILTERS, type StaffFilter } from "../list";
import { MOCK_STAFF, createMockStaff, deactivateMockStaff, updateMockStaff } from "../mock-data";

type DrawerState = { mode: "create" } | { mode: "edit"; staff: Staff } | null;

// MW-08 – Nhân viên. Dữ liệu mô phỏng giữ trong state của màn hình; thay bằng TanStack Query khi nối API.
export function StaffScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();
  const [staff, setStaff] = useState<Staff[]>(MOCK_STAFF);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [deactivating, setDeactivating] = useState<Staff | null>(null);

  const filter = parseStaffFilter(searchParams.get("filter"));
  const counts = countStaff(staff);
  const visible = filterStaff(staff, filter);

  function handleFilterChange(next: StaffFilter) {
    router.replace(withQuery(ROUTES.staff, { filter: next === "all" ? null : next }), { scroll: false });
  }

  function handleCreate(request: StaffCreateRequest) {
    // Chạy trong sự kiện, không chạy lúc render (Cache Components không cho giá trị ngẫu nhiên khi render).
    // Trùng số điện thoại thì createMockStaff ném ApiError 409 DUPLICATE_CONTACT như API thật; StaffForm bắt lỗi và
    // hiện dưới ô số điện thoại, ngăn kéo vẫn mở, dòng bên dưới không chạy.
    setStaff(createMockStaff(staff, request, crypto.randomUUID()));
    setDrawer(null);
    showSuccess(`Đã tạo tài khoản cho ${request.fullName}`);
  }

  function handleUpdate(request: StaffUpdateRequest) {
    if (drawer?.mode !== "edit") return;
    const { staffId } = drawer.staff;
    setStaff((current) => updateMockStaff(current, staffId, request));
    setDrawer(null);
    showSuccess(`Đã lưu thông tin ${request.fullName}`);
  }

  function handleConfirmDeactivate() {
    if (!deactivating) return;
    const { staffId, fullName } = deactivating;
    setStaff((current) => deactivateMockStaff(current, staffId));
    setDeactivating(null);
    showSuccess(`Đã vô hiệu hóa ${fullName}.`);
  }

  const chipCounts: Record<StaffFilter, number> = {
    all: counts.all,
    spa: counts.spa,
    receptionist: counts.receptionist,
    inactive: counts.inactive,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Nhân viên</h1>
          <p className="text-muted">
            {counts.activeSpa} nhân viên spa và {counts.activeReceptionist} lễ tân đang hoạt động.
          </p>
        </div>
        <Button onClick={() => setDrawer({ mode: "create" })}>
          <Icon name="user-plus" className="size-[18px]" />
          Thêm nhân viên
        </Button>
      </div>

      <div role="group" aria-label="Lọc nhân viên" className="flex flex-wrap gap-2">
        {STAFF_FILTERS.map((item) => (
          <FilterChip
            key={item.value}
            active={filter === item.value}
            count={chipCounts[item.value]}
            onClick={() => handleFilterChange(item.value)}
          >
            {item.label}
          </FilterChip>
        ))}
      </div>

      <StaffTable staff={visible} onEdit={(member) => setDrawer({ mode: "edit", staff: member })} onDeactivate={setDeactivating} />

      <p className="text-xs text-muted">
        Màn hình này chỉ tạo tài khoản lễ tân và nhân viên spa. Lịch làm việc của nhân viên spa đặt tại Lịch làm việc.
      </p>

      {drawer && (
        <Drawer
          size="narrow"
          title={drawer.mode === "edit" ? `Sửa nhân viên: ${drawer.staff.fullName}` : "Thêm nhân viên"}
          onClose={() => setDrawer(null)}
        >
          <StaffForm
            staff={drawer.mode === "edit" ? drawer.staff : undefined}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onCancel={() => setDrawer(null)}
          />
        </Drawer>
      )}

      {deactivating && (
        <DeactivateStaffDialog staff={deactivating} onConfirm={handleConfirmDeactivate} onCancel={() => setDeactivating(null)} />
      )}
    </div>
  );
}
