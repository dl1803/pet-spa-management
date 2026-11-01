"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import type { Service, ServiceRequest } from "@/lib/api/types";
import { ServiceForm } from "../components/service-form";
import { ServiceTable } from "../components/service-table";
import { countServices } from "../forms";
import { MOCK_SERVICES, MOCK_SLOT_TIMES, buildMockService } from "../mock-data";

type DrawerState = { mode: "create" } | { mode: "edit"; service: Service } | null;

// MW-06 – Danh mục dịch vụ. Dữ liệu mô phỏng giữ trong state của màn hình; thay bằng TanStack Query khi nối API.
export function ServicesScreen() {
  const { showSuccess } = useToast();
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [stopping, setStopping] = useState<Service | null>(null);

  const { active, inactive } = countServices(services);

  function handleSave(request: ServiceRequest) {
    if (drawer?.mode === "edit") {
      const { serviceId, isActive } = drawer.service;
      const updated = buildMockService(request, { serviceId, isActive });
      setServices((current) => current.map((item) => (item.serviceId === serviceId ? updated : item)));
    } else {
      // Chạy trong sự kiện, không chạy lúc render (Cache Components không cho giá trị ngẫu nhiên khi render).
      const created = buildMockService(request, { serviceId: crypto.randomUUID(), isActive: true });
      setServices((current) => [...current, created]);
    }
    setDrawer(null);
    showSuccess(`Đã lưu dịch vụ ${request.name}`);
  }

  function handleSetActive(serviceId: string, isActive: boolean) {
    setServices((current) => current.map((item) => (item.serviceId === serviceId ? { ...item, isActive } : item)));
  }

  function handleConfirmStop() {
    if (!stopping) return;
    handleSetActive(stopping.serviceId, false);
    setStopping(null);
    showSuccess("Đã ngừng cung cấp dịch vụ");
  }

  function handleReopen(service: Service) {
    handleSetActive(service.serviceId, true);
    showSuccess(`Đã mở lại ${service.name}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Dịch vụ</h1>
          <p className="text-muted">
            {active} dịch vụ đang cung cấp, {inactive} đã ngừng. Giá, thời lượng, số nhân viên đặt theo loài và nhóm kích cỡ.
          </p>
        </div>
        <Button onClick={() => setDrawer({ mode: "create" })}>
          <Icon name="plus" className="size-[18px]" />
          Thêm dịch vụ
        </Button>
      </div>

      <ServiceTable
        services={services}
        onEdit={(service) => setDrawer({ mode: "edit", service })}
        onStop={setStopping}
        onReopen={handleReopen}
      />

      <p className="text-xs text-muted">
        Dịch vụ đã ngừng không còn hiển thị khi khách đặt lịch mới. Giá và thời lượng sửa xong áp dụng cho các lượt đặt lịch tiếp theo.
      </p>

      {drawer && (
        <Drawer
          title={drawer.mode === "edit" ? `Sửa dịch vụ: ${drawer.service.name}` : "Thêm dịch vụ"}
          onClose={() => setDrawer(null)}
        >
          <ServiceForm
            service={drawer.mode === "edit" ? drawer.service : undefined}
            slotTimes={MOCK_SLOT_TIMES}
            onSubmit={handleSave}
            onCancel={() => setDrawer(null)}
          />
        </Drawer>
      )}

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
