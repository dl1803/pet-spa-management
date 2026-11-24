// Thu nhỏ ảnh ở trình duyệt trước khi tải lên (SA 3.2: nén, thu nhỏ ảnh; Frontend-Architecture mục 9: cạnh dài 1600px, JPEG 0,8) (Đề xuất).
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_JPEG_QUALITY = 0.8;

// Giữ tỷ lệ, cạnh dài không vượt `maxEdge`; ảnh nhỏ hơn giữ nguyên kích thước, mỗi cạnh tối thiểu 1px.
export function getResizedSize(width: number, height: number, maxEdge = PHOTO_MAX_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// Vẽ ảnh lên canvas rồi xuất JPEG; backend chỉ nhận JPEG, PNG, WebP nên ảnh luôn tải lên dưới dạng JPEG.
// Ném lỗi khi trình duyệt không đọc được ảnh (ví dụ định dạng không hỗ trợ); chỉ chạy trong trình duyệt.
export async function resizePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = getResizedSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("Không tạo được canvas.");
    // JPEG không có nền trong suốt: ảnh PNG/WebP trong suốt sẽ có nền trắng thay vì đen.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY));
    if (blob === null) throw new Error("Không xuất được ảnh JPEG.");
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
