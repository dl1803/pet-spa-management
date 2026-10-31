type AvatarProps = {
  name: string;
  tone: "teal";
};

const TONE_CLASS = {
  teal: "bg-lagoon-50 text-lagoon-700",
} as const;

// Chữ cái đầu của họ và tên cuối, theo UI demo: “Lê Minh Tâm” → “LT”.
function getInitials(name: string) {
  const words = name.normalize("NFC").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const letters = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return letters.map((word) => Array.from(word)[0]).join("").toLocaleUpperCase("vi-VN");
}

// Trang trí: tên đã được đọc ở ngay bên cạnh nên ẩn khỏi trình đọc màn hình.
export function Avatar({ name, tone }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${TONE_CLASS[tone]}`}
    >
      {getInitials(name)}
    </span>
  );
}
