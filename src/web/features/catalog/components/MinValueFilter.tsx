const PERCENT_UNIT = '%';
const PERCENT_OPTIONS = [80, 85, 90, 95, 100];

interface MinValueFilterProps {
  label: string;
  unit: string | undefined;
  range: [number, number];
  value: number | null;
  onChange: (value: number | null) => void;
}

export function MinValueFilter({ label, unit, range, value, onChange }: MinValueFilterProps) {
  if (unit === PERCENT_UNIT) {
    return (
      <label className="flex flex-col gap-1">
        {label}
        <select
          value={value ?? ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? null : Number(event.target.value))
          }
          className="rounded border px-3 py-2"
        >
          <option value="">Sin mínimo</option>
          {PERCENT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}%
            </option>
          ))}
        </select>
      </label>
    );
  }

  const [min, max] = range;
  const current = value ?? min;

  return (
    <label className="flex flex-col gap-1">
      {label}: {current}
      {unit ? ` ${unit}` : ''}
      <input
        type="range"
        min={min}
        max={max}
        value={current}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
