// Khung chờ của MW-08 trong <Suspense> ở app/(main)/nhan-vien/page.tsx. StaffScreen đọc tham số lọc trên URL
// (useSearchParams) nên bắt buộc nằm trong Suspense; khung này giữ sẵn tiêu đề để trang không trắng trước khi tải xong.
// Cố ý nằm trong features/staff, không thêm thành phần dùng chung (Frontend-Conventions 11: không sửa file dùng chung ở một web).
export function StaffScreenFallback() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div>
        <h1>Nhân viên</h1>
        <p role="status" className="text-muted">Đang tải danh sách nhân viên…</p>
      </div>
    </div>
  );
}
