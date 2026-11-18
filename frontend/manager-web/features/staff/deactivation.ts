export type DeactivationOutcome = {
  // Nội dung thông báo thành công.
  message: string;
  // Có lịch về Chờ xác nhận thì chuyển Quản lý tới màn Chờ xác nhận để phân công lại (UI-Screens MW-08·D2).
  openPending: boolean;
};

// Kết quả của POST /staff/{id}/deactivate (BR-27). Lễ tân và nhân viên spa không có lịch Đã xác nhận trả 0:
// chỉ nêu số lịch khi có lịch về Chờ xác nhận, tránh câu "0 lịch" vô nghĩa.
export function describeDeactivation(fullName: string, returnedToPending: number): DeactivationOutcome {
  if (returnedToPending > 0) {
    return { message: `Đã vô hiệu hóa ${fullName}. ${returnedToPending} lịch đã về Chờ xác nhận.`, openPending: true };
  }
  return { message: `Đã vô hiệu hóa ${fullName}.`, openPending: false };
}
