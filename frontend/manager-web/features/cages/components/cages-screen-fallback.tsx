// Khung chờ của MW-07 trong <Suspense> ở app/(main)/chuong-va-gia/page.tsx. CagesScreen đọc tab trên URL (useSearchParams)
// nên bắt buộc nằm trong Suspense; khung này giữ sẵn tiêu đề để trang không trắng trước khi tải xong.
export function CagesScreenFallback() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div>
        <h1>Chuồng và giá lưu trú</h1>
        <p role="status" className="text-muted">Đang tải chuồng và giá lưu trú…</p>
      </div>
    </div>
  );
}
