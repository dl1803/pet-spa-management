import { PaymentBadge } from "@/components/domain/payment-badge";
import { Button } from "@/components/ui/button";
import { formatAppointmentCode, formatMoney } from "@/lib/format";
import { PAYMENT_KIND_LABELS } from "@/lib/labels";
import { describeParties, describeRecord, type PaymentRow } from "../list";

type PaymentsTableProps = {
  rows: PaymentRow[];
  onRecord: (row: PaymentRow) => void;
};

const headerClass = "px-4 py-3 text-left text-xs font-semibold text-muted";

// MW-10 vùng 3 – Bảng khoản thanh toán (UI-Screens.md). Số tiền và trạng thái lấy nguyên từ server (`amount`, `status`).
// Mã lịch hiển thị dạng chữ, chưa là liên kết vì trang chi tiết lịch hẹn (MW-05) chưa có.
export function PaymentsTable({ rows, onRecord }: PaymentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse">
        <thead className="bg-mist">
          <tr>
            <th scope="col" className={headerClass}>Lịch hẹn</th>
            <th scope="col" className={headerClass}>Khoản</th>
            <th scope="col" className={`${headerClass} text-right`}>Số tiền</th>
            <th scope="col" className={headerClass}>Trạng thái</th>
            <th scope="col" className={headerClass}>Ghi nhận</th>
            <th scope="col" className={`${headerClass} text-right`}><span className="sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const code = formatAppointmentCode(row.appointmentId);
            const parties = describeParties(row);
            const record = describeRecord(row);
            return (
              <tr key={row.paymentId} className="border-t border-line-soft align-middle hover:bg-[#F8FBFB]">
                <td className="px-4 py-3">
                  <div className="font-semibold tabular-nums">{code}</div>
                  {parties && <div className="text-xs text-muted">{parties}</div>}
                </td>
                <td className="px-4 py-3">{PAYMENT_KIND_LABELS[row.kind]}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(row.amount)}</td>
                <td className="px-4 py-3"><PaymentBadge status={row.status} /></td>
                <td className="px-4 py-3">
                  {record ? (
                    <>
                      <div className="font-semibold">{record.method}</div>
                      {record.detail && <div className="text-xs text-muted tabular-nums">{record.detail}</div>}
                    </>
                  ) : (
                    <span className="text-muted">–</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {row.status === "Unpaid" && (
                      <Button variant="secondary" size="sm" aria-label={`Ghi nhận thanh toán ${code}`} onClick={() => onRecord(row)}>
                        Ghi nhận
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
