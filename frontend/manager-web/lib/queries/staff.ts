import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStaff, deactivateStaff, listStaff, updateStaff, type ListStaffParams } from "@/lib/api/endpoints/staff";
import type { StaffCreateRequest, StaffUpdateRequest } from "@/lib/api/types";
import { useRefreshAppointments } from "@/lib/queries/appointments";

export const staffKeys = {
  all: ["staff"] as const,
  list: (params: ListStaffParams) => ["staff", "list", params] as const,
};

// MW-08 vùng 3: tải một trang 100 nhân viên, không phân trang trên giao diện (UI-Screens).
export const STAFF_PAGE_SIZE = 100;

const STAFF_PARAMS: ListStaffParams = { page: 1, pageSize: STAFF_PAGE_SIZE };

export function useStaffList() {
  return useQuery({ queryKey: staffKeys.list(STAFF_PARAMS), queryFn: () => listStaff(STAFF_PARAMS) });
}

// Làm mới danh sách từ server trước khi mutation báo xong, kể cả khi lỗi (404/409 nghĩa là dữ liệu đã đổi),
// để màn hình luôn hiển thị kết quả server (Frontend-Architecture 5.1).
function useRefreshStaff() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: staffKeys.all, refetchType: "all" });
}

export function useCreateStaff() {
  const refreshStaff = useRefreshStaff();
  return useMutation({
    mutationFn: (request: StaffCreateRequest) => createStaff(request),
    onSettled: refreshStaff,
  });
}

export function useUpdateStaff() {
  const refreshStaff = useRefreshStaff();
  return useMutation({
    mutationFn: (params: { staffId: string; request: StaffUpdateRequest }) => updateStaff(params.staffId, params.request),
    onSettled: refreshStaff,
  });
}

// Vô hiệu hóa nhân viên spa đưa lịch Đã xác nhận của họ về Chờ xác nhận (BR-27): làm mới cả danh sách lịch hẹn
// để màn Chờ xác nhận và đề xuất phân công hiện kết quả server (Frontend-Architecture 5.1).
export function useDeactivateStaff() {
  const refreshStaff = useRefreshStaff();
  const refreshAppointments = useRefreshAppointments();
  return useMutation({
    mutationFn: (staffId: string) => deactivateStaff(staffId),
    onSettled: () => Promise.all([refreshStaff(), refreshAppointments()]),
  });
}
