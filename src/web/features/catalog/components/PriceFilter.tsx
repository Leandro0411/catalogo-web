import type { Currency } from '../../../../shared/types/tenant.types';

const CENTS_PER_UNIT = 100;

interface PriceFilterProps {
  currencies: Currency[];
  defaultCurrency: Currency;
  value: { currency: Currency; amountCents: number } | null;
  onChange: (value: { currency: Currency; amountCents: number } | null) => void;
}

export function PriceFilter({ currencies, defaultCurrency, value, onChange }: PriceFilterProps) {
  const currency =
    value?.currency ?? (currencies.includes(defaultCurrency) ? defaultCurrency : currencies[0]);
  const amountText = value ? String(value.amountCents / CENTS_PER_UNIT) : '';

  const handleAmountChange = (text: string): void => {
    if (text.trim() === '') {
      onChange(null);
      return;
    }

    const amount = Number(text);

    if (!Number.isFinite(amount) || amount < 0 || currency === undefined) {
      return;
    }

    onChange({ currency, amountCents: Math.round(amount * CENTS_PER_UNIT) });
  };

  const handleCurrencyChange = (nextCurrency: Currency): void => {
    if (value) {
      onChange({ ...value, currency: nextCurrency });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-gray-700">Precio máximo</span>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Precio máximo"
          aria-label="Precio máximo"
          value={amountText}
          onChange={(event) => handleAmountChange(event.target.value)}
          className="flex-1 rounded border px-3 py-2"
        />
        <select
          value={currency}
          onChange={(event) => handleCurrencyChange(event.target.value as Currency)}
          className="rounded border px-3 py-2"
        >
          {currencies.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
