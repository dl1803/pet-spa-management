"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Pager } from "@/components/ui/pager";
import type { CounterPaymentRequest } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { ROUTES, withQuery } from "@/lib/routes";
import { CounterPaymentDialog } from "../components/counter-payment-dialog";
import { PaymentFilters } from "../components/payment-filters";
import { PaymentsTable } from "../components/payments-table";
import {
  PAYMENT_PAGE_SIZE,
  countPayments,
  filterPageRows,
  getPageRange,
  parsePage,
  parsePaymentKindFilter,
  parsePaymentMethodFilter,
  parsePaymentStatusFilter,
  resolvePage,
  summarizeUnpaid,
  type PaymentKindFilter,
  type PaymentMethodFilter,
  type PaymentRow,
  type PaymentStatusFilter,
} from "../list";
import { MOCK_PAYMENTS, getMockPaymentPage, recordMockCounterPayment } from "../mock-data";

// MW-10 – Thanh toán. Dữ liệu mô phỏng giữ trong state của màn hình; thay bằng TanStack Query khi nối API.
export function PaymentsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();
  const [payments, setPayments] = useState<PaymentRow[]>(MOCK_PAYMENTS);
  const [recording, setRecording] = useState<PaymentRow | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const status = parsePaymentStatusFilter(searchParams.get("status"));
  const kind = parsePaymentKindFilter(searchParams.get("kind"));
  const method = parsePaymentMethodFilter(searchParams.get("method"));

  // Thẻ số liệu và số trên chip lấy từ mọi khoản chưa thanh toán, không phụ thuộc bộ lọc hay trang (MW-10 vùng 1).
  const unpaid = summarizeUnpaid(payments);
  const page = resolvePage(parsePage(searchParams.get("page")), countPayments(payments, status), PAYMENT_PAGE_SIZE);
  const pageData = getMockPaymentPage(payments, { status, page, pageSize: PAYMENT_PAGE_SIZE });
  // Lọc ở web: API chưa có tham số kind, method (UI-Screens G-07); chỉ áp dụng cho trang đang xem.
  const rows = filterPageRows(pageData.items, kind, method);
  const isWebFiltered = kind !== "all" || method !== "all";
  const isFiltered = status !== "all" || isWebFiltered;
  const range = getPageRange(pageData.page, pageData.pageSize, pageData.total);

  // Đổi bộ lọc thì về trang 1 (Frontend-Conventions 8); tham số mặc định không ghi lên URL.
  function navigate(next: { status?: PaymentStatusFilter; kind?: PaymentKindFilter; method?: PaymentMethodFilter; page?: number }) {
    const nextStatus = next.status ?? status;
    const nextKind = next.kind ?? kind;
    const nextMethod = next.method ?? method;
    router.replace(
      withQuery(ROUTES.payments, {
        status: nextStatus === "all" ? null : nextStatus,
        kind: nextKind === "all" ? null : nextKind,
        method: nextMethod === "all" ? null : nextMethod,
        page: next.page && next.page > 1 ? String(next.page) : null,
      }),
      { scroll: false },
    );
  }

  function handleRecord(request: CounterPaymentRequest) {
    if (!recording) return;
    const { paymentId, amount } = recording;
    // Chạy trong sự kiện, không chạy lúc render (Cache Components không cho giá trị theo thời gian khi render).
    // recordMockCounterPayment ném ApiError như API thật; CounterPaymentDialog bắt lỗi, hộp thoại vẫn mở,
    // các dòng bên dưới không chạy.
    setPayments(recordMockCounterPayment(payments, paymentId, request, new Date().toISOString()));
    setRecording(null);
    showSuccess(`Đã ghi nhận thanh toán ${formatMoney(amount)}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 ref={headingRef} tabIndex={-1}>Thanh toán</h1>
        <p className="text-muted">Tình trạng từng khoản thanh toán của các lịch hẹn.</p>
      </div>

      {/* G-07: API chưa có thống kê theo tháng nên tạm chỉ hiện thẻ “Chưa thanh toán”. */}
      <div className="grid grid-cols-3 gap-4 max-[860px]:grid-cols-1">
        <KpiTile icon="hourglass" label="Chưa thanh toán" value={String(unpaid.count)} caption={formatMoney(unpaid.total)} accent />
      </div>

      <Card>
        <PaymentFilters
          status={status}
          kind={kind}
          method={method}
          unpaidCount={unpaid.count}
          onStatusChange={(next) => navigate({ status: next })}
          onKindChange={(next) => navigate({ kind: next })}
          onMethodChange={(next) => navigate({ method: next })}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="wallet"
            title={isWebFiltered ? "Không có khoản nào khớp bộ lọc trên trang này" : isFiltered ? "Không có khoản nào khớp bộ lọc" : "Chưa có khoản thanh toán nào"}
            description={
              isFiltered
                ? "Thử đổi hoặc bỏ bộ lọc để xem các khoản khác."
                : "Khoản thanh toán xuất hiện khi lịch hẹn đến thời điểm thu tiền."
            }
            action={
              isFiltered ? (
                <Button variant="secondary" onClick={() => router.replace(ROUTES.payments, { scroll: false })}>
                  Bỏ bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <PaymentsTable rows={rows} onRecord={setRecording} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3">
          <p className="text-xs text-muted tabular-nums">
            {isWebFiltered
              ? `${rows.length} khoản khớp trên trang này`
              : `Hiển thị ${range.from} – ${range.to} trong ${pageData.total} khoản`}
          </p>
          <Pager
            className=""
            page={pageData.page}
            pageSize={pageData.pageSize}
            total={pageData.total}
            onPageChange={(next) => navigate({ page: next })}
          />
        </div>
      </Card>

      {isWebFiltered && (
        <p className="text-xs text-muted">Bộ lọc khoản và phương thức chỉ áp dụng cho các khoản của trang đang xem.</p>
      )}
      <p className="text-xs text-muted">
        Lịch spa chỉ phát sinh khoản thanh toán khi hoàn tất. Lịch lưu trú có tối đa 2 khoản: tiền lưu trú và phí trả muộn.
      </p>

      {recording && (
        <CounterPaymentDialog
          payment={recording}
          onSubmit={handleRecord}
          onClose={() => setRecording(null)}
          fallbackFocusRef={headingRef}
        />
      )}
    </div>
  );
}
