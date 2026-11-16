// Khung chờ của MW-04 trong <Suspense> ở app/(main)/cho-xac-nhan/page.tsx. PendingScreen đọc tham số trên URL
// (useSearchParams) nên bắt buộc nằm trong Suspense; khung này giữ sẵn tiêu đề để trang không trắng trước khi tải xong.
export function PendingScreenFallback() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div>
        <h1>Lịch hẹn chờ xác nhận</h1>
        <p role="status" className="text-muted">Đang tải danh sách lịch chờ xác nhận…</p>
      </div>
    </div>
  );
}
