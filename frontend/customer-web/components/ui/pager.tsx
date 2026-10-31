import { Icon } from "@/components/icons";

type PagerProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

const buttonClass =
  "grid h-8 min-w-8 cursor-pointer place-items-center rounded-lg border px-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50";

export function Pager({ page, pageSize, total, onPageChange }: PagerProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Phân trang" className="mt-5 flex flex-wrap justify-end gap-1">
      <button
        type="button"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={`${buttonClass} border-line bg-white text-ink`}
      >
        <Icon name="chev-l" className="size-4" />
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
        <button
          key={number}
          type="button"
          aria-label={`Trang ${number}`}
          aria-current={number === page ? "page" : undefined}
          onClick={() => onPageChange(number)}
          className={`${buttonClass} ${
            number === page ? "border-lagoon bg-lagoon font-semibold text-white" : "border-line bg-white text-ink"
          }`}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        aria-label="Trang sau"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={`${buttonClass} border-line bg-white text-ink`}
      >
        <Icon name="chev-r" className="size-4" />
      </button>
    </nav>
  );
}

