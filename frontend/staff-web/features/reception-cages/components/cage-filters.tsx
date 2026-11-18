import { FilterChip } from "@/components/ui/filter-chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import {
  SPECIES_FILTERS,
  STATE_FILTERS,
  type CageFilters,
  type SizeFilter,
  type SpeciesFilter,
  type StateFilter,
} from "@/features/reception-cages/cages";
import { SIZE_GROUP_LABELS } from "@/lib/labels";

type CageFiltersBarProps = {
  filters: CageFilters;
  onChange: (next: CageFilters) => void;
};

export function CageFiltersBar({ filters, onChange }: CageFiltersBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Lọc theo loài" className="flex flex-wrap gap-2">
        {SPECIES_FILTERS.map(({ value, label }) => (
          <FilterChip key={value} active={filters.species === value} onClick={() => onChange({ ...filters, species: value as SpeciesFilter })}>
            {label}
          </FilterChip>
        ))}
      </div>
      <div className="w-[200px] max-[640px]:w-full">
        <Select
          aria-label="Nhóm kích cỡ"
          value={filters.size}
          onChange={(event) => onChange({ ...filters, size: event.target.value as SizeFilter })}
        >
          <option value="all">Mọi nhóm kích cỡ</option>
          <option value="Small">{SIZE_GROUP_LABELS.Small}</option>
          <option value="Medium">{SIZE_GROUP_LABELS.Medium}</option>
          <option value="Large">{SIZE_GROUP_LABELS.Large}</option>
        </Select>
      </div>
      <div className="ml-auto max-[860px]:ml-0">
        <SegmentedControl
          label="Lọc theo tình trạng"
          items={STATE_FILTERS}
          value={filters.state}
          onChange={(value) => onChange({ ...filters, state: value as StateFilter })}
        />
      </div>
    </div>
  );
}
