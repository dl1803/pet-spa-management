"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { FilterChip } from "@/components/ui/filter-chip";
import { isForbiddenError } from "@/lib/api/errors";
import type { Staff, StaffCreateRequest, StaffUpdateRequest } from "@/lib/api/types";
import { useCreateStaff, useDeactivateStaff, useStaffList, useUpdateStaff } from "@/lib/queries/staff";
import { ROUTES, withQuery } from "@/lib/routes";
import { DeactivateStaffDialog } from "../components/deactivate-staff-dialog";
import { StaffForm } from "../components/staff-form";
import { StaffTable } from "../components/staff-table";
import { describeDeactivation } from "../deactivation";
import { countStaff, filterStaff, parseStaffFilter, STAFF_FILTERS, type StaffFilter } from "../list";

type DrawerState = { mode: "create" } | { mode: "edit"; staff: Staff } | null;

// MW-08 – Nhân viên. Dữ liệu lấy từ GET /staff; thêm, sửa, vô hiệu hóa gọi API rồi tải lại danh sách từ server.
export function StaffScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useToast();
  const { data: page, error, isPending, refetch } = useStaffList();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deactivateStaff = useDeactivateStaff();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [deactivating, setDeactivating] = useState<Staff | null>(null);

  const staff = page?.items;
  const filter = parseStaffFilter(searchParams.get("filter"));
  const isSaving = createStaff.isPending || updateStaff.isPending;

  function handleFilterChange(next: StaffFilter) {
    router.replace(withQuery(ROUTES.staff, { filter: next === "all" ? null : next }), { scroll: false });
  }

  function closeDrawer() {
    // Đang chờ server trả lời thì giữ ngăn kéo mở để người dùng thấy kết quả.
    if (isSaving) return;
    setDrawer(null);
  }

  // Trả Promise để StaffForm chờ: 409 DUPLICATE_CONTACT hiện dưới ô số điện thoại, lỗi khác hiện ở đầu form,
  // ngăn kéo vẫn mở và dòng bên dưới không chạy khi mutateAsync từ chối.
  async function handleCreate(request: StaffCreateRequest) {
    await createStaff.mutateAsync(request);
    setDrawer(null);
    showSuccess(`Đã tạo tài khoản cho ${request.fullName}`);
  }

  async function handleUpdate(request: StaffUpdateRequest) {
    if (drawer?.mode !== "edit") return;
    await updateStaff.mutateAsync({ staffId: drawer.staff.staffId, request });
    setDrawer(null);
    showSuccess(`Đã lưu thông tin ${request.fullName}`);
  }

  function handleConfirmDeactivate() {
    if (!deactivating || deactivateStaff.isPending) return;
    const { staffId, fullName } = deactivating;
    setDeactivating(null);
    deactivateStaff.mutate(staffId, {
      onSuccess: ({ returnedToPending }) => {
        const outcome = describeDeactivation(fullName, returnedToPending);
        showSuccess(outcome.message);
        if (outcome.openPending) router.push(ROUTES.pending);
      },
      onError: (failure) => showError(failure),
    });
  }

  function renderContent() {
    if (staff === undefined) {
      if (isPending) {
        return (
          <p role="status" aria-busy="true" className="text-muted">
            Đang tải danh sách nhân viên…
          </p>
        );
      }
      if (isForbiddenError(error)) return <ForbiddenState />;
      return (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={error} className="w-full" />
          <Button variant="secondary" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      );
    }

    const counts = countStaff(staff);
    const chipCounts: Record<StaffFilter, number> = {
      all: counts.all,
      spa: counts.spa,
      receptionist: counts.receptionist,
      inactive: counts.inactive,
    };

    return (
      <>
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
        <StaffTable
          staff={filterStaff(staff, filter)}
          onEdit={(member) => setDrawer({ mode: "edit", staff: member })}
          onDeactivate={setDeactivating}
          isDeactivating={deactivateStaff.isPending}
        />
        <p className="text-xs text-muted">
          Màn hình này chỉ tạo tài khoản lễ tân và nhân viên spa. Lịch làm việc của nhân viên spa đặt tại Lịch làm việc.
        </p>
      </>
    );
  }

  const counts = staff === undefined ? null : countStaff(staff);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Nhân viên</h1>
          {counts && (
            <p className="text-muted">
              {counts.activeSpa} nhân viên spa và {counts.activeReceptionist} lễ tân đang hoạt động.
            </p>
          )}
        </div>
        {staff !== undefined && (
          <Button onClick={() => setDrawer({ mode: "create" })}>
            <Icon name="user-plus" className="size-[18px]" />
            Thêm nhân viên
          </Button>
        )}
      </div>

      {renderContent()}

      {drawer && (
        <Drawer
          size="narrow"
          title={drawer.mode === "edit" ? `Sửa nhân viên: ${drawer.staff.fullName}` : "Thêm nhân viên"}
          onClose={closeDrawer}
        >
          <StaffForm
            staff={drawer.mode === "edit" ? drawer.staff : undefined}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onCancel={closeDrawer}
          />
        </Drawer>
      )}

      {deactivating && (
        <DeactivateStaffDialog staff={deactivating} onConfirm={handleConfirmDeactivate} onCancel={() => setDeactivating(null)} />
      )}
    </div>
  );
}
