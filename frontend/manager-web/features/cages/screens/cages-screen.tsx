"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useToast } from "@/components/feedback/toast";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import type { Cage, CageCreateRequest } from "@/lib/api/types";
import { MOCK_NOW } from "@/lib/mock-shop-day";
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
import { CAGES_TABS, parseCagesTab, summarizeCages, type CagesTab } from "../list";
import { MOCK_CAGES, createMockCage, setMockCageActive, updateMockCage } from "../mock-data";

type ModalState = { mode: "create" } | { mode: "edit"; cage: Cage } | null;

// Nút “Lưu bảng giá” ở đầu trang gắn với form giá qua thuộc tính `form`.
const PRICING_FORM_ID = "hotel-pricing-form";

// MW-07 – Chuồng và giá lưu trú. Tab Giá lấy dữ liệu từ GET /hotel/pricing và lưu bằng PUT /hotel/pricing.
// Tab Chuồng vẫn dùng dữ liệu mô phỏng giữ trong state của màn hình (backend chưa có GET /cages); thay bằng TanStack Query khi có.
export function CagesScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();
  const [cages, setCages] = useState<Cage[]>(MOCK_CAGES);
  const [modal, setModal] = useState<ModalState>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

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
  const { total } = summarizeCages(cages);

  // Tab mặc định (Chuồng) không ghi lên URL.
  function handleTabChange(next: CagesTab) {
    router.replace(withQuery(ROUTES.cages, { tab: next === "cages" ? null : next }), { scroll: false });
  }

  // Có thể ném ApiError 409 DUPLICATE_CAGE_CODE như API thật; CageForm bắt lỗi, hộp thoại vẫn mở, các dòng bên dưới không chạy.
  // Dùng danh sách hiện tại trong closure (không dùng hàm cập nhật của setState) để lỗi ném ra trong sự kiện, không ném lúc render.
  function handleSubmitCage(request: CageCreateRequest) {
    if (modal?.mode === "edit") {
      setCages(updateMockCage(cages, modal.cage.cageId, request));
      showSuccess(`Đã lưu chuồng ${request.code}`);
    } else {
      // Chạy trong sự kiện, không chạy lúc render (Cache Components không cho giá trị ngẫu nhiên khi render).
      setCages(createMockCage(cages, request, crypto.randomUUID()));
      showSuccess(`Đã thêm chuồng ${request.code}`);
    }
    setModal(null);
  }

  function handleStop(cage: Cage) {
    setCages((current) => setMockCageActive(current, cage.cageId, false));
    showSuccess(`Đã ngừng sử dụng chuồng ${cage.code}`);
  }

  function handleReopen(cage: Cage) {
    setCages((current) => setMockCageActive(current, cage.cageId, true));
    showSuccess(`Đã mở lại chuồng ${cage.code}`);
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

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>Chuồng và giá lưu trú</h1>
          <p className="text-muted">Sức chứa lưu trú là số chuồng đang sử dụng.</p>
        </div>
        {tab === "cages" ? (
          <Button onClick={() => setModal({ mode: "create" })}>
            <Icon name="plus" className="size-[18px]" />
            Thêm chuồng
          </Button>
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
        items={CAGES_TABS.map((item) => ({ ...item, count: item.value === "cages" ? total : undefined }))}
      />

      {/* Cả hai tab luôn nằm trong cây; tab không chọn bị ẩn để các ô giá đang nhập không bị gỡ khi đổi tab. */}
      <div hidden={tab !== "cages"}>
        <div className="flex flex-col gap-5">
          <CageStats cages={cages} />
          <CageTable
            cages={cages}
            now={MOCK_NOW}
            onAdd={() => setModal({ mode: "create" })}
            onEdit={(cage) => setModal({ mode: "edit", cage })}
            onStop={handleStop}
            onReopen={handleReopen}
          />
        </div>
      </div>

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
          onClose={() => setModal(null)}
          fallbackFocusRef={headingRef}
        />
      )}
    </div>
  );
}
