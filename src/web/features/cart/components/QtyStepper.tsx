import { MinusIcon, PlusIcon } from '../../../shared/components/Icons';

interface QtyStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

export function QtyStepper({ value, max, onChange }: QtyStepperProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-gray-200 p-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Restar cantidad"
        className="grid h-9 w-9 place-items-center rounded-full text-gray-700 transition active:bg-gray-100 disabled:opacity-25"
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span
        aria-label="Cantidad"
        className="w-7 text-center text-[15px] font-semibold text-gray-900 tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Sumar cantidad"
        className="grid h-9 w-9 place-items-center rounded-full text-gray-700 transition active:bg-gray-100 disabled:opacity-25"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
