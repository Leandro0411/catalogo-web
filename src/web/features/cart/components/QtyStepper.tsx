interface QtyStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

export function QtyStepper({ value, max, onChange }: QtyStepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Restar cantidad"
        className="h-8 w-8 rounded border disabled:opacity-40"
      >
        −
      </button>
      <span aria-label="Cantidad" className="w-6 text-center">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Sumar cantidad"
        className="h-8 w-8 rounded border disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
