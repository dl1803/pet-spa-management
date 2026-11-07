// Khung chờ của MW-10 trong <Suspense> ở app/(main)/thanh-toan/page.tsx. PaymentsScreen đọc tham số lọc trên URL
// (useSearchParams) nên bắt buộc nằm trong Suspense; khung này giữ sẵn tiêu đề để trang không trắng trước khi tải xong.
export function PaymentsScreenFallback() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div>
        <h1>Thanh toán</h1>
        <p role="status" className="text-muted">Đang tải danh sách thanh toán…</p>
      </div>
    </div>
  );
}
