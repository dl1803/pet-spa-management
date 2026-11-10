import type { UseFormRegisterReturn } from "react-hook-form";
import { MoneyField } from "@/features/reception-payments/components/money-field";
import { getTransferContent } from "@/features/reception-payments/payment";
import { STORE_BANK } from "@/lib/store-info";

const QR_SIZE = 25;
const FINDER_SIZE = 7;

function isFinderCell(x: number, y: number) {
  const nearStart = (value: number) => value < FINDER_SIZE + 1;
  const nearEnd = (value: number) => value >= QR_SIZE - FINDER_SIZE - 1;
  return (nearStart(x) && nearStart(y)) || (nearEnd(x) && nearStart(y)) || (nearStart(x) && nearEnd(y));
}

function isFinderDark(x: number, y: number) {
  const local = (value: number) => (value < FINDER_SIZE ? value : value - (QR_SIZE - FINDER_SIZE));
  const lx = local(x);
  const ly = local(y);
  if (lx < 0 || ly < 0 || lx >= FINDER_SIZE || ly >= FINDER_SIZE) return false;
  const edge = lx === 0 || ly === 0 || lx === FINDER_SIZE - 1 || ly === FINDER_SIZE - 1;
  const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
  return edge || core;
}

// Hình QR minh họa, cố định, không mã hóa dữ liệu và không quét được. Mã QR thật không thuộc phạm vi hiện tại.
function buildIllustrativeQrPath() {
  let path = "";
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      const dark = isFinderCell(x, y) ? isFinderDark(x, y) : (x * 31 + y * 17 + x * y * 7) % 5 < 2;
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return path;
}

const QR_PATH = buildIllustrativeQrPath();

type QrPanelProps = {
  appointmentId: string;
  receivedId: string;
  confirmId: string;
  receivedRegistration: UseFormRegisterReturn;
  confirmRegistration: UseFormRegisterReturn;
  error?: string;
};

// Vùng 8: thông tin chuyển khoản, số tiền đã nhận và ô xác nhận đã kiểm tra tiền vào tài khoản cửa hàng.
export function QrPanel({ appointmentId, receivedId, confirmId, receivedRegistration, confirmRegistration, error }: QrPanelProps) {
  const rows = [
    { label: "Ngân hàng", value: STORE_BANK.bankName },
    { label: "Số tài khoản", value: STORE_BANK.accountNumber },
    { label: "Nội dung", value: getTransferContent(appointmentId) },
  ];

  return (
    <div className="flex flex-wrap items-start gap-5 rounded-xl border border-line px-4 py-4">
      <svg
        role="img"
        aria-label="Mã QR chuyển khoản (hình minh họa)"
        viewBox={`-1 -1 ${QR_SIZE + 2} ${QR_SIZE + 2}`}
        className="size-32 shrink-0 rounded-[10px] border border-line-soft bg-white p-2 text-ink"
        shapeRendering="crispEdges"
      >
        <path d={QR_PATH} fill="currentColor" />
      </svg>
      <div className="flex min-w-[240px] flex-1 flex-col gap-3">
        <dl className="flex flex-col gap-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">{row.label}</dt>
              <dd className="text-right font-semibold tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        <MoneyField id={receivedId} label="Số tiền đã nhận" registration={receivedRegistration} error={error} />
        <label htmlFor={confirmId} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
          <input id={confirmId} type="checkbox" className="size-[18px] shrink-0 cursor-pointer accent-lagoon" {...confirmRegistration} />
          Đã kiểm tra tiền vào tài khoản cửa hàng
        </label>
      </div>
    </div>
  );
}
