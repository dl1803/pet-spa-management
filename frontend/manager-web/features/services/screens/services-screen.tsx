"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { isForbiddenError } from "@/lib/api/errors";
import type { Service, ServiceRequest } from "@/lib/api/types";
import { useCreateService, useServices, useSetServiceStatus, useUpdateService } from "@/lib/queries/services";
import { ServiceForm } from "../components/service-form";
import { ServiceTable } from "../components/service-table";
import { SLOT_TIMES, countServices } from "../forms";

type DrawerState = { mode: "create" } | { mode: "edit"; service: Service } | null;

type ServicesScreenProps = {
  initialDrawer?: DrawerState;
  initialStopping?: Service | null;
};

// MW-06 – Danh mục dịch vụ. Dữ liệu lấy từ GET /services; thêm, sửa, ngừng / mở lại gọi API rồi tải lại danh sách từ server.
export function ServicesScreen({ initialDrawer = null, initialStopping = null }: ServicesScreenProps = {}) {
  const { showError, showSuccess } = useToast();
  const { data: services, error, isPending, refetch } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const setStatus = useSetServiceStatus();
  const [drawer, setDrawer] = useState<DrawerState>(initialDrawer);
  const [stopping, setStopping] = useState<Service | null>(initialStopping);

  const saving = drawer?.mode === "edit" ? updateService : createService;

  function openDrawer(next: Exclude<DrawerState, null>) {
    // Xóa lỗi của lần lưu trước để ngăn kéo mới mở không hiện lại lỗi cũ.
    createService.reset();
    updateService.reset();
    setDrawer(next);
  }

  function closeDrawer() {
    // Đang chờ server trả lời thì giữ ngăn kéo mở để người dùng thấy kết quả.
    if (saving.isPending) return;
    createService.reset();
    updateService.reset();
    setDrawer(null);
  }

  function handleSave(request: ServiceRequest) {
    if (saving.isPending) return;
    const onSuccess = () => {
      setDrawer(null);
      showSuccess(`Đã lưu dịch vụ ${request.name}`);
    };
    if (drawer?.mode === "edit") {
      updateService.mutate({ serviceId: drawer.service.serviceId, request }, { onSuccess });
    } else {
      createService.mutate(request, { onSuccess });
    }
  }

  function changeStatus(service: Service, isActive: boolean, message: string) {
    if (setStatus.isPending) return;
    setStatus.mutate(
      { serviceId: service.serviceId, isActive },
      { onSuccess: () => showSuccess(message), onError: (failure) => showError(failure) },
    );
  }

  function handleConfirmStop() {
    if (!stopping) return;
    const service = stopping;
    setStopping(null);
    changeStatus(service, false, "Đã ngừng cung cấp dịch vụ");
  }

  function handleReopen(service: Service) {
    changeStatus(service, true, `Đã mở lại ${service.name}`);
  }

  function renderContent() {
    if (services === undefined) {
      if (isPending) {
        return (
          <p role="status" aria-busy="true" className="text-muted">
            Đang tải danh sách dịch vụ…
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

    if (services.length === 0) {
      return (
        <EmptyState
          icon="scissors"
          title="Chưa có dịch vụ nào"
          description="Bấm “Thêm dịch vụ” để tạo dịch vụ đầu tiên của cửa hàng."
        />
      );
    }

    return (
      <>
        <ServiceTable
          services={services}
          onEdit={(service) => openDrawer({ mode: "edit", service })}
          onStop={setStopping}
          onReopen={handleReopen}
          pendingServiceId={setStatus.isPending ? (setStatus.variables?.serviceId ?? null) : null}
          isChangingStatus={setStatus.isPending}
        />
        <p className="text-xs text-muted">
          Dịch vụ đã ngừng không còn hiển thị khi khách đặt lịch mới. Giá và thời lượng sửa xong áp dụng cho các lượt đặt lịch tiếp theo.
        </p>
      </>
    );
  }

  const counts = services === undefined ? null : countServices(services);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Dịch vụ</h1>
          <p className="text-muted">
            {counts
              ? `${counts.active} dịch vụ đang cung cấp, ${counts.inactive} đã ngừng. Giá, thời lượng, số nhân viên đặt theo loài và nhóm kích cỡ.`
              : "Giá, thời lượng, số nhân viên đặt theo loài và nhóm kích cỡ."}
          </p>
        </div>
        {services !== undefined && (
          <Button onClick={() => openDrawer({ mode: "create" })}>
            <Icon name="plus" className="size-[18px]" />
            Thêm dịch vụ
          </Button>
        )}
      </div>

      {renderContent()}

      {drawer && (
        <Drawer
          title={drawer.mode === "edit" ? `Sửa dịch vụ: ${drawer.service.name}` : "Thêm dịch vụ"}
          onClose={closeDrawer}
        >
          <ServiceForm
            service={drawer.mode === "edit" ? drawer.service : undefined}
            slotTimes={SLOT_TIMES}
            onSubmit={handleSave}
            onCancel={closeDrawer}
            isSubmitting={saving.isPending}
            submitError={saving.error}
          />
        </Drawer>
      )}

      {/* Hộp thoại xác nhận khi bấm Ngừng cung cấp dịch vụ (MW-06) */}
      {stopping && (
        <ConfirmDialog
          icon="ban"
          title="Ngừng cung cấp dịch vụ này?"
          description="Bạn có thể mở lại bất cứ lúc nào."
          confirmLabel="Ngừng cung cấp"
          onConfirm={handleConfirmStop}
          onCancel={() => setStopping(null)}
        >
          <p>Dịch vụ sẽ không còn hiển thị khi khách hàng và lễ tân đặt lịch mới.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
