import type { SpaSuggestions } from "@/lib/api/types";

// Dữ liệu mô phỏng theo UI demo (MW-04), đúng hình dạng SpaSuggestions của GET /appointments/{id}/suggestions.
// Thay bằng dữ liệu API thật khi nối backend.
export type MockStaffAssignment = {
  appointmentId: string;
  title: string;
  suggestions: SpaSuggestions;
};

const TAM = { staffId: "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f01", fullName: "Lê Minh Tâm", recentAssignmentCount: 5 };
const HANH = { staffId: "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f02", fullName: "Nguyễn Thị Hạnh", recentAssignmentCount: 6 };
const QUYEN = { staffId: "6f1c2a9b-0d3e-4f51-8a47-1b2c3d4e5f03", fullName: "Trần Thị Quyên", recentAssignmentCount: 9 };

export const MOCK_STAFF_ASSIGNMENTS: MockStaffAssignment[] = [
  {
    appointmentId: "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e01",
    title: "Mochi, mèo Anh lông ngắn, nhóm Vừa",
    suggestions: { staffRequired: 1, suggested: [TAM], alternatives: [HANH, QUYEN] },
  },
  {
    appointmentId: "5f1c2a9b-7e44-4c0a-9d21-0a1b2c3d4e02",
    title: "Lu, chó Golden, nhóm Lớn",
    suggestions: { staffRequired: 2, suggested: [TAM, HANH], alternatives: [QUYEN] },
  },
];
