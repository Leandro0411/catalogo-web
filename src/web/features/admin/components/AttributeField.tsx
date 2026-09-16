import type { AttributeDef } from '../../../../shared/types/catalog.types';

interface AttributeFieldProps {
  def: AttributeDef;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function AttributeField({ def, value, onChange, error }: AttributeFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span>
        {def.label}
        {def.required ? ' *' : ''}
      </span>

      {def.type === 'enum' ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="">Seleccioná una opción</option>
          {def.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : def.type === 'number' ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="rounded border px-3 py-2"
          />
          {def.unit ? <span className="text-sm text-gray-500">{def.unit}</span> : null}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="rounded border px-3 py-2"
        />
      )}

      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </label>
  );
}
