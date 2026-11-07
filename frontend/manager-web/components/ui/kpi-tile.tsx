import { Icon, type IconName } from "@/components/icons";

type KpiTileProps = {
  icon: IconName;
  label: string;
  value: string;
  caption: string;
  // Nền Apricot nhạt cho số liệu cần quản lý chú ý (Design-System 4.1).
  accent?: boolean;
};

export function KpiTile({ icon, label, value, caption, accent = false }: KpiTileProps) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-apricot-100 bg-apricot-50" : "border-line bg-white"}`}>
      <div className="flex items-center gap-2 text-muted">
        <Icon name={icon} />
        {label}
      </div>
      <div className="mt-1 text-[28px] font-bold leading-[34px] tabular-nums">{value}</div>
      <div className="text-xs text-muted">{caption}</div>
    </div>
  );
}
