"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { useToast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { Pager } from "@/components/ui/pager";
import { isForbiddenError } from "@/lib/api/errors";
import type { CounterPaymentRequest } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { usePayments, useRecordCounterPayment, useUnpaidPayments } from "@/lib/queries/payments";
import { ROUTES, withQuery } from "@/lib/routes";
import { CounterPaymentDialog } from "../components/counter-payment-dialog";
import { PaymentFilters } from "../components/payment-filters";
import { PaymentsTable } from "../components/payments-table";
import {
  PAYMENT_PAGE_SIZE,
  filterPageRows,
  getPageRange,
  parsePage,
  parsePaymentKindFilter,
  parsePaymentMethodFilter,
  parsePaymentStatusFilter,
  resolvePage,
  summarizeUnpaidPage,
  type PaymentKindFilter,
  type PaymentMethodFilter,
  type PaymentRow,
  type PaymentStatusFilter,
} from "../list";

type PaymentsView = { status: PaymentStatusFilter; kind: PaymentKindFilter; method: PaymentMethodFilter; page: number };

// Bộ lọc và trang nằm trên URL; tham số mặc định không ghi lên URL (Frontend-Conventions 8).
function paymentsHref({ status, kind, method, page }: PaymentsView) {
  return withQuery(ROUTES.payments, {
    status: status === "all" ? null : status,
    kind: kind === "all" ? null : kind,
    method: method === "all" ? null : method,
    page: page > 1 ? String(page) : null,
  });
}

// MW-10 – Thanh toán. Danh sách lấy từ GET /payments; ghi nhận tại quầy gọi POST /payments/{id}/counter rồi tải lại từ server.
export function PaymentsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();
  const [recording, setRecording] = useState<PaymentRow | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const status = parsePaymentStatusFilter(searchParams.get("status"));
  const kind = parsePaymentKindFilter(searchParams.get("kind"));
  const method = parsePaymentMethodFilter(searchParams.get("method"));
  const requestedPage = parsePage(searchParams.get("page"));

  const list = usePayments({ status: status === "all" ? undefined : status, page: requestedPage, pageSize: PAYMENT_PAGE_SIZE });
  const unpaidList = useUnpaidPayments();
  const recordPayment = useRecordCounterPayment();

  // Thẻ số liệu và số trên chip lấy từ các khoản chưa thanh toán, không phụ thuộc bộ lọc hay trang (MW-10 vùng 1).
  const unpaid = unpaidList.data ? summarizeUnpaidPage(unpaidList.data) : null;

  // Trang vượt quá số trang hiện có thì lùi về trang cuối. Chỉ xét dữ liệu của chính trang đang yêu cầu, không xét dữ liệu giữ tạm.
  const pageData = list.data && !list.isPlaceholderData ? list.data : undefined;
  const page = pageData ? resolvePage(requestedPage, pageData.total, pageData.pageSize) : requestedPage;
  useEffect(() => {
    if (page !== requestedPage) router.replace(paymentsHref({ status, kind, method, page }), { scroll: false });
  }, [page, requestedPage, status, kind, method, router]);

  function navigate(next: Partial<PaymentsView>) {
    // Đổi bộ lọc thì về trang 1 (Frontend-Conventions 8).
    router.replace(paymentsHref({ status, kind, method, page: 1, ...next }), { scroll: false });
  }

  // Trả Promise để CounterPaymentDialog chờ: 409 AMOUNT_MISMATCH hiện dưới ô số tiền, lỗi khác hiện ở đầu form,
  // hộp thoại vẫn mở và các dòng bên dưới không chạy khi mutateAsync từ chối.
  async function handleRecord(request: CounterPaymentRequest) {
    if (!recording) return;
    const { paymentId, amount } = recording;
    await recordPayment.mutateAsync({ paymentId, request });
    setRecording(null);
    showSuccess(`Đã ghi nhận thanh toán ${formatMoney(amount)}`);
  }

  if (isForbiddenError(list.error)) {
    return (
      <div className="flex flex-col gap-5">
        <h1>Thanh toán</h1>
        <ForbiddenState />
      </div>
    );
  }

  // Lọc ở web: API chưa có tham số kind, method (UI-Screens G-07); chỉ áp dụng cho trang đang xem.
  const rows = list.data ? filterPageRows(list.data.items, kind, method) : [];
  const isWebFiltered = kind !== "all" || method !== "all";
  const isFiltered = status !== "all" || isWebFiltered;

  function renderBody() {
    const loading = (
      <p role="status" aria-busy="true" className="px-4 py-6 text-muted">
        Đang tải danh sách thanh toán…
      </p>
    );
    // Trang yêu cầu vượt quá số trang: đang chuyển về trang cuối.
    if (page !== requestedPage) return loading;
    if (list.data === undefined) {
      if (list.isPending) return loading;
      return (
        <div className="flex flex-col items-start gap-3 p-4">
          <ErrorAlert error={list.error} className="w-full" />
          <Button variant="secondary" onClick={() => void list.refetch()}>
            Thử lại
          </Button>
        </div>
      );
    }

    const range = getPageRange(list.data.page, list.data.pageSize, list.data.total);
    return (
      <>
        {list.isError && <ErrorAlert error={list.error} className="m-4" />}
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
              : `Hiển thị ${range.from} – ${range.to} trong ${list.data.total} khoản`}
          </p>
          <Pager
            className=""
            page={list.data.page}
            pageSize={list.data.pageSize}
            total={list.data.total}
            onPageChange={(next) => navigate({ page: next })}
          />
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 ref={headingRef} tabIndex={-1}>Thanh toán</h1>
        <p className="text-muted">Tình trạng từng khoản thanh toán của các lịch hẹn.</p>
      </div>

      {/* G-07: API chưa có thống kê theo tháng nên tạm chỉ hiện thẻ “Chưa thanh toán”. */}
      <div className="grid grid-cols-3 gap-4 max-[860px]:grid-cols-1">
        <KpiTile
          icon="hourglass"
          label="Chưa thanh toán"
          value={unpaid ? String(unpaid.count) : "–"}
          caption={
            unpaid
              ? unpaid.isPartial
                ? `${formatMoney(unpaid.total)}, tính trên ${unpaid.loaded} khoản mới nhất`
                : formatMoney(unpaid.total)
              : unpaidList.isPending
                ? "Đang tải…"
                : "Không tải được số liệu"
          }
          accent
        />
      </div>

      <Card>
        <PaymentFilters
          status={status}
          kind={kind}
          method={method}
          unpaidCount={unpaid?.count}
          onStatusChange={(next) => navigate({ status: next })}
          onKindChange={(next) => navigate({ kind: next })}
          onMethodChange={(next) => navigate({ method: next })}
        />
        {renderBody()}
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
