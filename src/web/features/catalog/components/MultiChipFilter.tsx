interface MultiChipFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function MultiChipFilter({ label, options, selected, onToggle }: MultiChipFilterProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);

          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
