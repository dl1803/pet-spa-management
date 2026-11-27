"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert } from "@/components/feedback/alert";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { isForbiddenError } from "@/lib/api/errors";
import type { Cage, CageCreateRequest } from "@/lib/api/types";
import { useCages, useCreateCage, useSetCageStatus, useUpdateCage } from "@/lib/queries/cages";
import { useHotelPricing, useUpdateHotelPricing } from "@/lib/queries/hotel-pricing";
import { ROUTES, withQuery } from "@/lib/routes";
import { CageForm } from "../components/cage-form";
import { CageStats } from "../components/cage-stats";
import { CageTable } from "../components/cage-table";
import { HotelPricingGate } from "../components/hotel-pricing-gate";
import { HotelPricingPanel } from "../components/hotel-pricing-panel";
import {
  createEmptyHotelPricingFormValues,
  createHotelPricingFormValues,
  findPricingProblems,
  toHotelPricingRequest,
  type HotelPricingFormValues,
} from "../forms";
import { CAGES_TABS, parseCagesTab, type CagesTab } from "../list";

type ModalState = { mode: "create" } | { mode: "edit"; cage: Cage } | null;

// Nút “Lưu bảng giá” ở đầu trang gắn với form giá qua thuộc tính `form`.
const PRICING_FORM_ID = "hotel-pricing-form";

// MW-07 – Chuồng và giá lưu trú. Tab Chuồng lấy dữ liệu từ GET /cages và ghi qua POST/PUT/PATCH /cages;
// tab Giá lấy dữ liệu từ GET /hotel/pricing và lưu bằng PUT /hotel/pricing.
export function CagesScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useToast();
  const [loadedAt] = useState(() => new Date().toISOString());
  const [modal, setModal] = useState<ModalState>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const cagesQuery = useCages();
  const createCage = useCreateCage();
  const updateCage = useUpdateCage();
  const setCageStatus = useSetCageStatus();

  // Form giá nằm ở màn hình, không ở tab, để giá đang sửa dở không mất khi chuyển qua lại giữa hai tab.
  // `values` đưa giá từ server vào form khi tải xong hoặc khi tải lại; ô người dùng đang sửa dở được giữ nguyên.
  const pricingQuery = useHotelPricing();
  const updatePricing = useUpdateHotelPricing();
  const pricingForm = useForm<HotelPricingFormValues>({
    defaultValues: createEmptyHotelPricingFormValues(),
    values: pricingQuery.data ? createHotelPricingFormValues(pricingQuery.data) : undefined,
    resetOptions: { keepDirtyValues: true },
    mode: "onTouched",
  });
  const pricingRows = useWatch({ control: pricingForm.control, name: "rows" });
  const pricingProblems = findPricingProblems(pricingRows);

  const tab = parseCagesTab(searchParams.get("tab"));
  const cagesPage = cagesQuery.data;
  const cages = cagesPage?.items;
  const now = cagesQuery.dataUpdatedAt > 0 ? new Date(cagesQuery.dataUpdatedAt).toISOString() : loadedAt;
  const isSavingCage = createCage.isPending || updateCage.isPending;

  // Tab mặc định (Chuồng) không ghi lên URL.
  function handleTabChange(next: CagesTab) {
    router.replace(withQuery(ROUTES.cages, { tab: next === "cages" ? null : next }), { scroll: false });
  }

  // Trả Promise để CageForm chờ: 409 DUPLICATE_CAGE_CODE hiện dưới ô mã chuồng, lỗi khác hiện đầu form,
  // hộp thoại vẫn mở và các dòng bên dưới không chạy khi mutateAsync từ chối.
  async function handleSubmitCage(request: CageCreateRequest) {
    if (modal?.mode === "edit") {
      await updateCage.mutateAsync({ cageId: modal.cage.cageId, request });
      setModal(null);
      showSuccess(`Đã lưu chuồng ${request.code}`);
      return;
    }
    await createCage.mutateAsync(request);
    setModal(null);
    showSuccess(`Đã thêm chuồng ${request.code}`);
  }

  function changeStatus(cage: Cage, isActive: boolean, message: string) {
    if (setCageStatus.isPending) return;
    setCageStatus.mutate(
      { cageId: cage.cageId, isActive },
      { onSuccess: () => showSuccess(message), onError: (failure) => showError(failure) },
    );
  }

  function handleStop(cage: Cage) {
    changeStatus(cage, false, `Đã ngừng sử dụng chuồng ${cage.code}`);
  }

  function handleReopen(cage: Cage) {
    changeStatus(cage, true, `Đã mở lại chuồng ${cage.code}`);
  }

  const handleSavePricing = pricingForm.handleSubmit((values) => {
    if (updatePricing.isPending) return;
    updatePricing.mutate(toHotelPricingRequest(values), {
      onSuccess: (_result, request) => {
        // Hiển thị lại số theo dạng chuẩn (“175000” → “175.000”); giá vừa lưu trở thành giá trị gốc của form.
        // reset() thừa hưởng resetOptions của form nên phải tắt keepDirtyValues, nếu không ô vừa sửa giữ nguyên chữ đã gõ.
        pricingForm.reset(createHotelPricingFormValues(request), { keepDirtyValues: false });
        showSuccess("Đã lưu bảng giá. Áp dụng cho lịch lưu trú tạo từ bây giờ.");
      },
    });
  });

  function renderCagesContent() {
    if (cagesPage === undefined || cages === undefined) {
      if (cagesQuery.isPending) {
        return (
          <p role="status" aria-busy="true" className="text-muted">
            Đang tải danh sách chuồng…
          </p>
        );
      }
      if (isForbiddenError(cagesQuery.error)) return <ForbiddenState />;
      return (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={cagesQuery.error} className="w-full" />
          <Button variant="secondary" onClick={() => void cagesQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        {cagesPage.total > cages.length && (
          <Alert tone="warn">
            Có {cagesPage.total} chuồng, đang hiển thị {cages.length} chuồng đầu tiên.
          </Alert>
        )}
        <CageStats cages={cages} />
        <CageTable
          cages={cages}
          now={now}
          onAdd={() => setModal({ mode: "create" })}
          onEdit={(cage) => setModal({ mode: "edit", cage })}
          onStop={handleStop}
          onReopen={handleReopen}
          isChangingStatus={setCageStatus.isPending}
          pendingCageId={setCageStatus.isPending ? (setCageStatus.variables?.cageId ?? null) : null}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>Chuồng và giá lưu trú</h1>
          <p className="text-muted">Sức chứa lưu trú là số chuồng đang sử dụng.</p>
        </div>
        {tab === "cages" ? (
          cages !== undefined && (
            <Button onClick={() => setModal({ mode: "create" })}>
              <Icon name="plus" className="size-[18px]" />
              Thêm chuồng
            </Button>
          )
        ) : (
          <Button
            type="submit"
            form={PRICING_FORM_ID}
            disabled={!pricingQuery.data || pricingProblems.length > 0 || updatePricing.isPending}
          >
            {updatePricing.isPending ? "Đang lưu…" : "Lưu bảng giá"}
          </Button>
        )}
      </div>

      <Tabs
        label="Chuồng và giá lưu trú"
        value={tab}
        onChange={handleTabChange}
        items={CAGES_TABS.map((item) => ({ ...item, count: item.value === "cages" ? cagesPage?.total : undefined }))}
      />

      {/* Cả hai tab luôn nằm trong cây; tab không chọn bị ẩn để các ô giá đang nhập không bị gỡ khi đổi tab. */}
      <div hidden={tab !== "cages"}>{renderCagesContent()}</div>

      <div hidden={tab !== "pricing"}>
        <HotelPricingGate
          hasData={pricingQuery.data !== undefined}
          isPending={pricingQuery.isPending}
          error={pricingQuery.error}
          onRetry={() => void pricingQuery.refetch()}
        >
          <form id={PRICING_FORM_ID} noValidate onSubmit={handleSavePricing}>
            <HotelPricingPanel
              register={pricingForm.register}
              problems={pricingProblems}
              lateFeeError={pricingForm.formState.errors.lateFeePerBlock?.message}
              submitError={updatePricing.error}
            />
          </form>
        </HotelPricingGate>
      </div>

      {modal && (
        <CageForm
          cage={modal.mode === "edit" ? modal.cage : undefined}
          onSubmit={handleSubmitCage}
          onClose={() => {
            if (!isSavingCage) setModal(null);
          }}
          fallbackFocusRef={headingRef}
        />
      )}
    </div>
  );
}
